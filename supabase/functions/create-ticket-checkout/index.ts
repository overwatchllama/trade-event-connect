import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, newRequestId } from "../_shared/errors.ts";

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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const { orderId, eventId, eventTitle, quantity, unitPrice } = await req.json();

    if (!orderId || !eventId || !eventTitle || !quantity || !unitPrice) {
      throw new Error("Missing required fields");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: userData.user.email,
      limit: 1,
    });

    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          supabase_user_id: userData.user.id,
        },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "https://trade-event-connect.lovable.app";

    const session = await stripe.checkout.sessions.create({
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

    // Update order with Stripe session ID
    await supabaseClient
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    console.log("Created checkout session:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[create-ticket-checkout][${requestId}] Error creating checkout:`, error);
    return errorResponse(error, {
      status: 400,
      defaultType: "TicketCheckoutError",
      requestId,
      headers: corsHeaders,
    });
  }
});
