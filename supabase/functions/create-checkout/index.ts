import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestBody = await req.json();
    
    // Check if this is a subscription or one-time payment
    if (requestBody.priceAmount !== undefined) {
      // One-time payment (e.g., event tickets)
      const { priceAmount, successUrl, cancelUrl, metadata } = requestBody;
      
      if (priceAmount === undefined) {
        throw new Error("Missing priceAmount for one-time payment");
      }

      logStep("One-time payment request", { priceAmount, metadata });

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2023-10-16",
      });

      // Check if customer already exists
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { 
                name: metadata?.event_title || "Event Ticket",
                description: "Event ticket purchase"
              },
              unit_amount: Math.round(priceAmount * 100), // Convert dollars to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl || `${req.headers.get("origin")}/events?ticket=success`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/events`,
        metadata: metadata || {},
      });

      logStep("One-time checkout session created", { sessionId: session.id, url: session.url });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Subscription payment
    const { tier, billing_period } = requestBody;
    if (!tier || !billing_period) {
      throw new Error("Missing tier or billing_period");
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
      throw new Error("Invalid subscription tier");
    }

    const priceData = pricing[billing_period as keyof typeof pricing];
    if (!priceData) {
      throw new Error("Invalid billing period");
    }

    logStep("Pricing configured", { tier, billing_period, priceData });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card', 'paypal', 'link'],
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
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});