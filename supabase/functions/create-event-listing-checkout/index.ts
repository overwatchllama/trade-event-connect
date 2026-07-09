import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tier pricing: derived server-side from event size/duration.
// Small: ≤1 day AND (max_attendees null or ≤100) → $25
// Medium: 2 days OR max_attendees 101–500 → $75
// Large: 3+ days OR max_attendees > 500 → $150
function computeTier(dayCount: number, maxAttendees: number | null): { tier: string; cents: number } {
  const attendees = maxAttendees ?? 0;
  if (dayCount >= 3 || attendees > 500) return { tier: "large", cents: 15000 };
  if (dayCount === 2 || attendees > 100) return { tier: "medium", cents: 7500 };
  return { tier: "small", cents: 2500 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = newRequestId();
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new HttpError("StripeConfigError", "STRIPE_SECRET_KEY missing", 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new HttpError("MissingAuthHeader", "Unauthorized", 401);

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser();
    if (authErr || !user?.email) throw new HttpError("Unauthorized", "Unauthorized", 401);

    const { eventId } = await req.json();
    if (!eventId) throw new HttpError("MissingFields", "eventId required", 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select("id, title, organizer_id, max_attendees, is_multi_day, listing_payment_status")
      .eq("id", eventId)
      .single();
    if (eventErr || !event) throw new HttpError("EventNotFound", "Event not found", 404);
    if (event.organizer_id !== user.id) throw new HttpError("Forbidden", "Not the organizer", 403);
    if (event.listing_payment_status === "paid") {
      throw new HttpError("AlreadyPaid", "Listing already paid", 409);
    }

    // Count days from event_days if multi-day
    let dayCount = 1;
    if (event.is_multi_day) {
      const { count } = await supabaseAdmin
        .from("event_days")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      dayCount = Math.max(1, count ?? 1);
    }

    const { tier, cents } = computeTier(dayCount, event.max_attendees);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") ?? "";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Event Listing Fee (${tier}) — ${event.title}`,
            description: `Listing fee for ${dayCount}-day event${event.max_attendees ? `, up to ${event.max_attendees} attendees` : ""}`,
          },
          unit_amount: cents,
        },
        quantity: 1,
      }],
      success_url: `${origin}/organize?listing_payment=success&event=${eventId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/organize?listing_payment=cancelled&event=${eventId}`,
      metadata: { eventId, userId: user.id, tier, cents: String(cents) },
    });

    await supabaseAdmin
      .from("events")
      .update({
        listing_tier: tier,
        listing_fee_cents: cents,
        listing_stripe_session_id: session.id,
      })
      .eq("id", eventId);

    return new Response(JSON.stringify({ url: session.url, tier, cents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[create-event-listing-checkout][${requestId}]`, error);
    return errorResponse(error, {
      defaultType: "CreateEventListingCheckoutError",
      requestId,
      headers: corsHeaders,
    });
  }
});
