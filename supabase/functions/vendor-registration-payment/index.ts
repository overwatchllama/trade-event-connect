import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VENDOR-REGISTRATION-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    logStep("Function started", { requestId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Also create anon client for user authentication
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { eventId, eventTitle, applicationId, tableFee, tableCount } = await req.json();
    if (!eventId || !eventTitle) {
      throw new Error("eventId and eventTitle are required");
    }
    logStep("Request parsed", { eventId, eventTitle, applicationId, tableFee, tableCount });

    // Check if user has an active pro subscription
    const { data: subscription, error: subError } = await supabaseService
      .from('subscribers')
      .select('subscribed, subscription_tier, subscription_end')
      .eq('email', user.email)
      .single();

    logStep("Subscription check", { subscription, error: subError });

    let isPro = false;
    if (subscription && subscription.subscribed) {
      // Check if they have vendor_pro or any pro tier
      isPro = subscription.subscription_tier === 'Vendor Pro' || 
              subscription.subscription_tier === 'vendor_pro';
      
      // Also check if subscription hasn't expired
      if (subscription.subscription_end) {
        const endDate = new Date(subscription.subscription_end);
        const now = new Date();
        if (endDate < now) {
          isPro = false;
        }
      }
    }

    logStep("Pro status determined", { isPro, tier: subscription?.subscription_tier });

    // If user is pro, no payment needed - return success directly
    if (isPro) {
      logStep("User is pro - no payment needed");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Registration successful - pro subscription waives fee",
        isPro: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Stripe for non-pro users
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Stripe customer check", { customerId });

    // Build line items - vendor table fee + platform fee
    const lineItems = [];
    
    // Add vendor table fee if there's one
    const vendorTableFee = tableFee || 0;
    if (vendorTableFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { 
            name: `Vendor Table Fee - ${eventTitle}`,
            description: `${tableCount || 1} table(s) at $${(vendorTableFee / (tableCount || 1)).toFixed(2)} each`
          },
          unit_amount: Math.round(vendorTableFee * 100), // Convert to cents
        },
        quantity: 1,
      });
    }
    
    // Add platform fee ($5)
    const platformFee = 500; // $5.00 in cents
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { 
          name: "Platform Service Fee",
          description: "One-time vendor registration processing fee"
        },
        unit_amount: platformFee,
      },
      quantity: 1,
    });

    logStep("Line items created", { vendorTableFee, platformFee, lineItemsCount: lineItems.length });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/events?registration=success&event=${eventId}`,
      cancel_url: `${req.headers.get("origin")}/events?registration=cancelled&event=${eventId}`,
      metadata: {
        eventId: eventId,
        userId: user.id,
        applicationId: applicationId || '',
        registrationType: 'vendor',
        vendorTableFee: vendorTableFee.toString(),
        platformFee: (platformFee / 100).toString()
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    const totalAmount = (vendorTableFee * 100) + platformFee;
    return new Response(JSON.stringify({ 
      url: session.url,
      isPro: false,
      amount: totalAmount,
      vendorTableFee: vendorTableFee,
      platformFee: platformFee / 100
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep("ERROR in vendor-registration-payment", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error, {
      status: 500,
      defaultType: "VendorRegistrationPaymentError",
      requestId,
      headers: corsHeaders,
    });
  }
});