// Demo login: returns a session for a pre-seeded @test.com account.
// SAFETY: only allows logging in as accounts whose email ends in @test.com.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

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

  const requestId = newRequestId();
  try {
    let body: { persona?: string };
    try {
      body = await req.json();
    } catch {
      throw new HttpError("InvalidJson", "Request body is not valid JSON", 400);
    }

    const { persona } = body;
    if (!persona || typeof persona !== "string") {
      throw new HttpError("MissingFields", "Missing 'persona' in request body.", 400);
    }

    const email = PERSONAS[persona];
    if (!email) {
      throw new HttpError("InvalidInput", `Unknown persona: ${persona}`, 400);
    }

    // Defense-in-depth: never allow login as a non-@test.com email.
    if (!email.endsWith("@test.com")) {
      throw new HttpError("Forbidden", "Refused: not a demo account.", 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anon = createClient(supabaseUrl, anonKey);
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });

    if (error || !data.session) {
      console.error(`[demo-login][${requestId}] Demo login failed`, { email, error });
      throw new HttpError(
        "ConfigError",
        "Could not start demo session. The demo accounts may need to be re-seeded.",
        500,
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
    console.error(`[demo-login][${requestId}] crash`, e);
    return errorResponse(e, {
      defaultType: "DemoLoginError",
      requestId,
      headers: corsHeaders,
    });
  }
});
