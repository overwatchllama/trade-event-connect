// Reset demo data to a clean snapshot.
// Admin-only (admin@test.com): deletes all @test.com auth users (cascading
// their profiles/vendors/applications/tickets/notifications), wipes any
// events still organized by them, then re-runs the existing seed-test-users
// edge function to recreate accounts + seeded events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- Authn: must be the admin demo user ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new HttpError("MissingAuthHeader", "No authorization header", 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      throw new HttpError("Unauthorized", "Unauthorized", 401);
    }
    const callerEmail = (userData.user.email ?? "").toLowerCase();
    if (callerEmail !== "admin@test.com") {
      throw new HttpError(
        "Forbidden",
        "Reset is restricted to the admin demo account (admin@test.com).",
        403,
      );
    }
    const { data: isAdminResult } = await admin.rpc("is_admin", {
      user_id: userData.user.id,
    });
    if (!isAdminResult) {
      throw new HttpError("AdminRequired", "Admin access required", 403);
    }

    // --- Step 1: collect all @test.com user IDs ---
    const demoUserIds: string[] = [];
    let page = 1;
    // Paginate through admin.listUsers (default perPage=50, max=1000).
    // We'll cap at 10 pages just to be safe.
    while (page <= 10) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listErr) throw listErr;
      const filtered = list.users.filter((u) =>
        (u.email ?? "").toLowerCase().endsWith("@test.com"),
      );
      demoUserIds.push(...filtered.map((u) => u.id));
      if (list.users.length < 200) break;
      page++;
    }

    // --- Step 2: wipe events organized by demo users ---
    // Events table doesn't necessarily cascade from auth.users, so clear
    // them explicitly. Related rows (event_days, applications, tickets,
    // notifications referencing these events) cascade via their own FKs
    // to events.id where defined; anything that doesn't is harmless leftover.
    let deletedEventCount = 0;
    if (demoUserIds.length > 0) {
      const { data: deletedEvents, error: evErr } = await admin
        .from("events")
        .delete()
        .in("organizer_id", demoUserIds)
        .select("id");
      if (evErr) {
        console.error(`[reset-demo-data][${requestId}] event wipe`, evErr);
      } else {
        deletedEventCount = deletedEvents?.length ?? 0;
      }
    }

    // --- Step 3: delete demo auth users ---
    // Deleting the auth user cascades to profiles, vendors, user_roles, etc.
    // because those reference auth.users(id) ON DELETE CASCADE.
    const userDeletes: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of demoUserIds) {
      const { error: delErr } = await admin.auth.admin.deleteUser(id);
      userDeletes.push({
        id,
        ok: !delErr,
        error: delErr?.message,
      });
    }

    // --- Step 4: re-seed via the existing seed-test-users function ---
    // We forward the same admin bearer token so its admin gate passes.
    // NOTE: at this point the admin auth user has just been deleted, so
    // the bearer token is no longer valid. We must mint a fresh service
    // call instead — invoke directly using the service-role key as bearer.
    const seedResp = await fetch(
      `${supabaseUrl}/functions/v1/seed-test-users`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    const seedJson = await seedResp.json().catch(() => ({}));
    if (!seedResp.ok) {
      throw new HttpError(
        "SeedFailed",
        `Re-seed failed: ${seedResp.status} ${JSON.stringify(seedJson)}`,
        500,
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deleted_demo_users: userDeletes.length,
        deleted_events: deletedEventCount,
        seed: seedJson,
        reset_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(`[reset-demo-data][${requestId}] crash`, e);
    return errorResponse(e, {
      defaultType: "ResetDemoDataError",
      requestId,
      headers: corsHeaders,
    });
  }
});
