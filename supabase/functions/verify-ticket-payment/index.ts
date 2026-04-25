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
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sessionId, orderId } = await req.json();

    if (!sessionId || !orderId) {
      throw new Error("Missing session ID or order ID");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Use service role to update order
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the order belongs to the authenticated user
    const { data: orderCheck, error: orderCheckError } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .eq("stripe_session_id", sessionId)
      .single();

    if (orderCheckError || !orderCheck || orderCheck.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Order not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order payment status
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "completed",
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", orderId)
      .eq("stripe_session_id", sessionId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order");
    }

    // Get user email from order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order for email:", orderError);
    } else {
      // Get user profile for email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .single();

      if (profile?.email) {
        // Send confirmation email in background
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        // @ts-ignore - EdgeRuntime is a Supabase Edge Runtime global
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/send-ticket-confirmation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              orderId,
              userEmail: profile.email,
              userName: profile.full_name,
            }),
          }).then(res => {
            if (!res.ok) {
              console.error("Failed to send confirmation email");
            } else {
              console.log("Confirmation email triggered successfully");
            }
          }).catch(err => {
            console.error("Error triggering confirmation email:", err);
          })
        );
      }
    }

    console.log("Order payment verified:", orderId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: "Payment verification failed" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
