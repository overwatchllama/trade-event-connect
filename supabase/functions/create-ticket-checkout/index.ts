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

    let body: { orderId?: string; eventId?: string; eventTitle?: string; quantity?: number; unitPrice?: number };
    try {
      body = await req.json();
    } catch (_e) {
      throw new HttpError("InvalidJson", "Request body is not valid JSON", 400);
    }

    const { orderId, eventId, eventTitle, quantity, unitPrice } = body;

    if (!orderId || !eventId || !eventTitle || quantity === undefined || unitPrice === undefined) {
      throw new HttpError("MissingFields", "Missing required fields: orderId, eventId, eventTitle, quantity, unitPrice", 400);
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new HttpError("InvalidQuantity", "quantity must be a positive integer", 422);
    }
    if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError("InvalidUnitPrice", "unitPrice must be a non-negative number", 422);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new HttpError("StripeConfigError", "Stripe is not configured on the server", 500);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
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
                description: `General Admission x ${quantity}`,
              },
              unit_amount: Math.round(unitPrice * 100),
            },
            quantity: quantity,
          },
        ],
        mode: "payment",
        success_url: `${origin}/tickets/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
        cancel_url: `${origin}/event/${eventId}`,
        metadata: {
          order_id: orderId,
          event_id: eventId,
          user_id: userData.user.id,
          quantity: quantity.toString(),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create Stripe checkout session";
      throw new HttpError("StripeSessionError", msg, 502);
    }

    // Update order with Stripe session ID
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ stripe_session_id: session.id })
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
