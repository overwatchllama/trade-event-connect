/**
 * RLS regression tests.
 *
 * Verifies critical security guarantees that are easy to silently break:
 *   1. PII columns on `vendor_applications` are NOT readable as anon
 *      (stripe_session_id, notes, file_url, organizer_notes).
 *   2. PII columns on `event_staff_assignments` are NOT readable as anon
 *      (assigned_email, assigned_phone, check_in_token).
 *   3. The `public_vendor_applications` view IS readable as anon and only
 *      exposes safe columns.
 *   4. Storage bucket `event-files` is private (anon cannot list / read).
 *   5. Storage bucket `event-flyers` is publicly readable.
 *   6. `subscribers` rows are NOT readable as anon.
 *
 * Run via the supabase--test_edge_functions tool, or:
 *   deno test --allow-net --allow-env supabase/functions/_rls_tests/rls_test.ts
 */

import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
await load({ export: true, allowEmptyValues: true, examplePath: null });
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL must be set");
assert(SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY must be set");

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──────────────────────────────────────────────────────────────────────────
// 1. vendor_applications PII columns are blocked for anon
// ──────────────────────────────────────────────────────────────────────────
Deno.test("vendor_applications: anon cannot read PII columns", async () => {
  const piiCols = ["stripe_session_id", "notes", "file_url", "organizer_notes"];
  for (const col of piiCols) {
    const { data, error } = await anon
      .from("vendor_applications")
      .select(col)
      .limit(1);
    // Either the column read is rejected by RLS (data empty) or the request
    // errors. Either way, no row containing that column may come back.
    if (data && data.length > 0) {
      const row = data[0] as unknown as Record<string, unknown>;
      assert(
        row[col] === undefined || row[col] === null,
        `anon unexpectedly read vendor_applications.${col}: ${JSON.stringify(row)}`,
      );
    }
    // An error is also acceptable (RLS / missing-column-style block)
    if (error) {
      assert(
        true,
        `anon read of vendor_applications.${col} blocked: ${error.message}`,
      );
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 2. event_staff_assignments PII is blocked for anon
// ──────────────────────────────────────────────────────────────────────────
Deno.test("event_staff_assignments: anon cannot read PII / tokens", async () => {
  const { data, error } = await anon
    .from("event_staff_assignments")
    .select("assigned_email, assigned_phone, check_in_token")
    .limit(5);

  // RLS should prevent any rows from being returned to anon.
  if (!error) {
    assertEquals(
      data?.length ?? 0,
      0,
      "anon should not see any event_staff_assignments rows",
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 3. public_vendor_applications view is readable & only exposes safe cols
// ──────────────────────────────────────────────────────────────────────────
Deno.test("public_vendor_applications: anon can read, only safe columns exist", async () => {
  const { data, error } = await anon
    .from("public_vendor_applications")
    .select("*")
    .limit(1);

  assertEquals(error, null, `view read failed: ${error?.message}`);
  assert(Array.isArray(data), "expected array result from view");

  if (data && data.length > 0) {
    const forbidden = [
      "stripe_session_id",
      "notes",
      "file_url",
      "organizer_notes",
    ];
    for (const col of forbidden) {
      assert(
        !(col in (data[0] as Record<string, unknown>)),
        `public_vendor_applications must not expose ${col}`,
      );
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 4. event-files storage bucket is private to anon
// ──────────────────────────────────────────────────────────────────────────
Deno.test("storage: event-files is private to anon", async () => {
  const { data, error } = await anon.storage.from("event-files").list("", {
    limit: 1,
  });
  // Either an explicit error or an empty list is acceptable; non-empty would
  // mean the bucket leaks contents.
  if (!error && data && data.length > 0) {
    throw new Error(
      `event-files unexpectedly listed ${data.length} entries to anon`,
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 5. event-flyers storage bucket is publicly readable
// ──────────────────────────────────────────────────────────────────────────
Deno.test("storage: event-flyers is publicly readable (bucket exists)", async () => {
  // We can't guarantee a specific file path exists, but we can verify the
  // bucket responds to a public-URL fetch with a non-auth (200/404 vs 401/403).
  const { data } = anon.storage
    .from("event-flyers")
    .getPublicUrl("does-not-exist.jpg");
  const res = await fetch(data.publicUrl);
  await res.body?.cancel();
  assert(
    res.status === 200 || res.status === 400 || res.status === 404,
    `event-flyers public URL returned auth-blocked status ${res.status}`,
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 6. subscribers rows are not readable by anon
// ──────────────────────────────────────────────────────────────────────────
Deno.test("subscribers: anon cannot read rows", async () => {
  const { data, error } = await anon
    .from("subscribers")
    .select("user_id, email, stripe_customer_id")
    .limit(5);

  if (!error) {
    assertEquals(
      data?.length ?? 0,
      0,
      "anon should not see any subscribers rows",
    );
  }
});
