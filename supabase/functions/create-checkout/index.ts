import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    logStep("Function started", { requestId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new HttpError("MissingAuthHeader", "No authorization header provided", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new HttpError("Unauthorized", "User not authenticated", 401);

    logStep("User authenticated", { userId: user.id, email: user.email });

    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch {
      throw new HttpError("InvalidJson", "Request body is not valid JSON", 400);
    }

    // SECURITY: the legacy one-time `priceAmount` path was removed because it
    // accepted an attacker-controlled price. One-time ticket purchases now go
    // through `create-ticket-checkout`, which derives the price server-side.
    if (requestBody.priceAmount !== undefined) {
      throw new HttpError(
        "DeprecatedPath",
        "One-time payments via create-checkout are disabled. Use create-ticket-checkout.",
        410,
      );
    }

    // Subscription payment
    const { tier, billing_period } = requestBody;
    if (!tier || !billing_period) {
      throw new HttpError("MissingFields", "Missing tier or billing_period", 400);
    }

    logStep("Request data", { tier, billing_period });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Define pricing for each tier and billing period
    const pricingConfig = {
      'event_pro': {
        monthly: { amount: 3000, interval: 'month' }, // $30/month
        yearly: { amount: 33000, interval: 'year' }   // $330/year
      },
      'vendor_pro': {
        monthly: { amount: 2000, interval: 'month' }, // $20/month
        yearly: { amount: 22000, interval: 'year' }   // $220/year
      },
      'collector_pro': {
        monthly: { amount: 500, interval: 'month' },  // $5/month
        yearly: { amount: 5500, interval: 'year' }    // $55/year
      }
    };

    const pricing = pricingConfig[tier as keyof typeof pricingConfig];
    if (!pricing) {
      throw new HttpError("InvalidInput", "Invalid subscription tier", 400);
    }

    const priceData = pricing[billing_period as keyof typeof pricing];
    if (!priceData) {
      throw new HttpError("InvalidInput", "Invalid billing period", 400);
    }

    logStep("Pricing configured", { tier, billing_period, priceData });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      // Using automatic payment methods - enables cards, Apple Pay, Google Pay, etc.
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `${tier.replace('_', ' ').toUpperCase()} Subscription`,
              description: `${billing_period === 'yearly' ? 'Annual' : 'Monthly'} subscription`
            },
            unit_amount: priceData.amount,
            recurring: { interval: priceData.interval as 'month' | 'year' },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscription-success`,
      cancel_url: `${req.headers.get("origin")}/`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR in create-checkout", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error, {
      defaultType: "CreateCheckoutError",
      requestId,
      headers: corsHeaders,
    });
  }
});