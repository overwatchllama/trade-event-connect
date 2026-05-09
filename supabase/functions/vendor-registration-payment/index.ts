import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

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
    if (!stripeKey) throw new HttpError("StripeConfigError", "STRIPE_SECRET_KEY is not set", 500);
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
    if (!authHeader) throw new HttpError("MissingAuthHeader", "No authorization header provided", 401);
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new HttpError("Unauthorized", `Authentication error: ${userError.message}`, 401);
    const user = userData.user;
    if (!user?.email) throw new HttpError("Unauthorized", "User not authenticated or email not available", 401);
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body — DO NOT trust client-supplied fee/count.
    const { eventId, eventTitle, applicationId } = await req.json();
    if (!eventId || !eventTitle || !applicationId) {
      throw new HttpError("MissingFields", "eventId, eventTitle and applicationId are required", 400);
    }
    logStep("Request parsed", { eventId, eventTitle, applicationId });

    // SECURITY: derive table count + price from server-side records.
    const { data: application, error: appError } = await supabaseService
      .from('vendor_applications')
      .select('id, user_id, event_id, requested_tables, approved_tables, application_status, payment_status')
      .eq('id', applicationId)
      .single();
    if (appError || !application) {
      throw new HttpError("ApplicationNotFound", "Vendor application not found", 404);
    }
    if (application.user_id !== user.id) {
      throw new HttpError("Forbidden", "Application does not belong to caller", 403);
    }
    if (application.event_id !== eventId) {
      throw new HttpError("EventMismatch", "Application does not match event", 400);
    }
    if (application.payment_status === 'paid') {
      throw new HttpError("AlreadyPaid", "This application is already paid", 409);
    }

    const { data: eventRow, error: eventError } = await supabaseService
      .from('events')
      .select('id, vendor_table_price')
      .eq('id', eventId)
      .single();
    if (eventError || !eventRow) {
      throw new HttpError("EventNotFound", "Event not found", 404);
    }

    const tableCount = Number(application.approved_tables ?? application.requested_tables ?? 1);
    const perTable = Number(eventRow.vendor_table_price ?? 0);
    if (!Number.isFinite(tableCount) || tableCount < 0 || !Number.isInteger(tableCount)) {
      throw new HttpError("InvalidTableCount", "Invalid approved table count", 422);
    }
    if (!Number.isFinite(perTable) || perTable < 0) {
      throw new HttpError("InvalidTablePrice", "Invalid table price", 422);
    }
    const vendorTableFee = perTable * tableCount;
    logStep("Server-derived fee", { tableCount, perTable, vendorTableFee });

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

    if (vendorTableFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { 
            name: `Vendor Table Fee - ${eventTitle}`,
            description: `${tableCount} table(s) at $${perTable.toFixed(2)} each`
          },
          unit_amount: Math.round(vendorTableFee * 100),
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
        applicationId: applicationId,
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
      defaultType: "VendorRegistrationPaymentError",
      requestId,
      headers: corsHeaders,
    });
  }
});