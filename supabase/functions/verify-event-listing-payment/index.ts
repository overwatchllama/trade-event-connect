import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = newRequestId();
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new HttpError("MissingAuthHeader", "Unauthorized", 401);

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser();
    if (authErr || !user) throw new HttpError("Unauthorized", "Unauthorized", 401);

    const { sessionId, eventId } = await req.json();
    if (!sessionId || !eventId) throw new HttpError("MissingFields", "sessionId & eventId required", 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new HttpError("PaymentRequired", "Payment not completed", 402);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select("id, organizer_id, listing_stripe_session_id")
      .eq("id", eventId)
      .single();
    if (eventErr || !event) throw new HttpError("EventNotFound", "Event not found", 404);
    if (event.organizer_id !== user.id) throw new HttpError("Forbidden", "Not the organizer", 403);
    if (event.listing_stripe_session_id !== sessionId) {
      throw new HttpError("SessionMismatch", "Session does not match event", 400);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("events")
      .update({
        listing_payment_status: "paid",
        listing_paid_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    if (updateErr) throw new HttpError("UpdateError", updateErr.message, 500);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[verify-event-listing-payment][${requestId}]`, error);
    return errorResponse(error, {
      defaultType: "VerifyEventListingPaymentError",
      requestId,
      headers: corsHeaders,
    });
  }
});
