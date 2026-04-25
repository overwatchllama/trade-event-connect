// Demo login: returns a session for a pre-seeded @test.com account.
// SAFETY: only allows logging in as accounts whose email ends in @test.com.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded shared password for all seeded test users.
// These accounts are PUBLIC demo accounts — do not store real data here.
const DEMO_PASSWORD = "test12";

// Allowlist of personas exposed via the /demo page.
const PERSONAS: Record<string, string> = {
  admin: "admin@test.com",
  organizer: "event@test.com",
  vendor: "vendor@test.com",
  collector: "user@test.com",
  vendor2: "vendor2@test.com",
  vendor3: "vendor3@test.com",
  vendor4: "vendor4@test.com",
  vendor5: "vendor5@test.com",
  vendor6: "vendor6@test.com",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { persona } = await req.json();

    if (!persona || typeof persona !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'persona' in request body." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const email = PERSONAS[persona];
    if (!email) {
      return new Response(
        JSON.stringify({ error: `Unknown persona: ${persona}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Defense-in-depth: never allow login as a non-@test.com email.
    if (!email.endsWith("@test.com")) {
      return new Response(
        JSON.stringify({ error: "Refused: not a demo account." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Sign in with the shared demo password using anon client — returns a session
    // we can hand back to the browser. No service role exposure to client.
    const anon = createClient(supabaseUrl, anonKey);
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });

    if (error || !data.session) {
      console.error("Demo login failed", { email, error });
      return new Response(
        JSON.stringify({
          error:
            "Could not start demo session. The demo accounts may need to be re-seeded.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        email,
        persona,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("demo-login crash", e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
