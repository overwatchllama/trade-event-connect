import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new HttpError("MissingAuthHeader", "Missing Authorization header", 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      throw new HttpError("Unauthorized", userError?.message || "Unauthorized", 401);
    }

    let body: { orderId?: string; eventId?: string; eventTitle?: string };
    try {
      body = await req.json();
    } catch (_e) {
      throw new HttpError("InvalidJson", "Request body is not valid JSON", 400);
    }

    const { orderId, eventId, eventTitle } = body;

    if (!orderId || !eventId || !eventTitle) {
      throw new HttpError("MissingFields", "Missing required fields: orderId, eventId, eventTitle", 400);
    }

    // SECURITY: derive total from server-side order_items rather than trusting client price.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, event_id")
      .eq("id", orderId)
      .single();
    if (orderError || !order) {
      throw new HttpError("OrderNotFound", "Order not found", 404);
    }
    if (order.user_id !== userData.user.id) {
      throw new HttpError("Forbidden", "Order does not belong to caller", 403);
    }
    if (order.event_id !== eventId) {
      throw new HttpError("OrderMismatch", "Order does not match event", 400);
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("quantity, unit_price")
      .eq("order_id", orderId);
    if (itemsError || !items || items.length === 0) {
      throw new HttpError("OrderItemsMissing", "Order has no items", 400);
    }

    let totalQuantity = 0;
    let totalCents = 0;
    for (const it of items) {
      const q = Number(it.quantity ?? 0);
      const p = Number(it.unit_price ?? 0);
      if (!Number.isFinite(q) || q <= 0 || !Number.isInteger(q)) {
        throw new HttpError("InvalidOrderItem", "Order item quantity invalid", 422);
      }
      if (!Number.isFinite(p) || p < 0) {
        throw new HttpError("InvalidOrderItem", "Order item price invalid", 422);
      }
      totalQuantity += q;
      totalCents += Math.round(p * 100) * q;
    }

    if (totalCents <= 0) {
      throw new HttpError("ZeroAmount", "Order total is zero", 422);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new HttpError("StripeConfigError", "Stripe is not configured on the server", 500);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Resolve / create Stripe customer
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({
        email: userData.user.email,
        limit: 1,
      });
      customerId = customers.data[0]?.id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData.user.email,
          metadata: { supabase_user_id: userData.user.id },
        });
        customerId = customer.id;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resolve Stripe customer";
      throw new HttpError("StripeCustomerError", msg, 502);
    }

    const origin = req.headers.get("origin") || "https://trade-event-connect.lovable.app";

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Event Ticket - ${eventTitle}`,
                description: `General Admission x ${totalQuantity}`,
              },
              // Charge the full server-derived total as a single line item
              unit_amount: totalCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/tickets/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
        cancel_url: `${origin}/event/${eventId}`,
        metadata: {
          order_id: orderId,
          event_id: eventId,
          user_id: userData.user.id,
          quantity: totalQuantity.toString(),
          expected_total_cents: totalCents.toString(),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create Stripe checkout session";
      throw new HttpError("StripeSessionError", msg, 502);
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id, total_amount: totalCents / 100 })
      .eq("id", orderId);

    if (updateError) {
      throw new HttpError("OrderUpdateError", `Failed to attach session to order: ${updateError.message}`, 500);
    }

    console.log(`[create-ticket-checkout][${requestId}] Created checkout session:`, session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[create-ticket-checkout][${requestId}] Error:`, error);
    return errorResponse(error, {
      defaultType: "TicketCheckoutError",
      requestId,
      headers: corsHeaders,
    });
  }
});
