import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for test subscriptions first (don't query Stripe for test customers)
    const { data: existingSub } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingSub?.stripe_customer_id?.startsWith('test_customer_')) {
      logStep("Test subscription found", { 
        tier: existingSub.subscription_tier,
        subscribed: existingSub.subscribed 
      });
      
      return new Response(JSON.stringify({
        subscribed: existingSub.subscribed,
        subscription_tier: existingSub.subscription_tier,
        subscription_end: existingSub.subscription_end,
        billing_period: existingSub.billing_period
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        billing_period: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      
      // Remove all subscription roles
      const allSubscriptionRoles = ['event_pro', 'vendor_pro', 'collector_pro'];
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .in('role', allSubscriptionRoles);
      
      logStep("Removed all subscription roles (no customer)");
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_tier: null,
        billing_period: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let billingPeriod = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      const interval = price.recurring?.interval;
      
      billingPeriod = interval === 'year' ? 'yearly' : 'monthly';
      
      // Determine tier based on amount and interval
      if (interval === 'month') {
        if (amount === 3000) subscriptionTier = 'event_pro';
        else if (amount === 2000) subscriptionTier = 'vendor_pro';
        else if (amount === 500) subscriptionTier = 'collector_pro';
      } else if (interval === 'year') {
        if (amount === 33000) subscriptionTier = 'event_pro';
        else if (amount === 22000) subscriptionTier = 'vendor_pro';
        else if (amount === 5500) subscriptionTier = 'collector_pro';
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        tier: subscriptionTier,
        billingPeriod
      });
    } else {
      logStep("No active subscription found");
    }

    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      billing_period: billingPeriod,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      subscriptionTier,
      billingPeriod
    });

    // Manage subscription roles
    const allSubscriptionRoles = ['event_pro', 'vendor_pro', 'collector_pro'];
    
    if (hasActiveSub && subscriptionTier) {
      // Grant the appropriate role for active subscription
      const { error: insertRoleError } = await supabaseClient
        .from('user_roles')
        .upsert(
          { user_id: user.id, role: subscriptionTier },
          { onConflict: 'user_id,role' }
        );
      
      if (insertRoleError) {
        logStep("Error granting subscription role", { error: insertRoleError.message });
      } else {
        logStep("Granted subscription role", { role: subscriptionTier });
      }
      
      // Remove other subscription roles
      const otherRoles = allSubscriptionRoles.filter(r => r !== subscriptionTier);
      if (otherRoles.length > 0) {
        const { error: deleteRoleError } = await supabaseClient
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .in('role', otherRoles);
        
        if (deleteRoleError) {
          logStep("Error removing other subscription roles", { error: deleteRoleError.message });
        } else {
          logStep("Removed other subscription roles", { removedRoles: otherRoles });
        }
      }
    } else {
      // No active subscription - remove all subscription roles
      const { error: deleteRoleError } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .in('role', allSubscriptionRoles);
      
      if (deleteRoleError) {
        logStep("Error removing subscription roles", { error: deleteRoleError.message });
      } else {
        logStep("Removed all subscription roles");
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      billing_period: billingPeriod
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});