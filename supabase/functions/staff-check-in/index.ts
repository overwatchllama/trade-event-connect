import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // GET: fetch staff assignment info by token
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token || token.length < 10) {
        throw new HttpError("InvalidInput", "Invalid token", 400);
      }

      const { data: assignment, error } = await supabase
        .from("event_staff_assignments")
        .select("id, assigned_name, checked_in, checked_in_at, checked_out_at, event_id, event_staff_roles(role_name)")
        .eq("check_in_token", token)
        .single();

      if (error || !assignment) {
        throw new HttpError("NotFound", "Staff assignment not found", 404);
      }

      const { data: event } = await supabase
        .from("events")
        .select("title, date, venue, city, state")
        .eq("id", assignment.event_id)
        .single();

      return new Response(
        JSON.stringify({
          id: assignment.id,
          name: assignment.assigned_name,
          role: (assignment as any).event_staff_roles?.role_name || "Staff",
          checked_in: assignment.checked_in,
          checked_in_at: assignment.checked_in_at,
          checked_out_at: assignment.checked_out_at,
          event: event
            ? {
                title: event.title,
                date: event.date,
                venue: event.venue,
                city: event.city,
                state: event.state,
              }
            : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: check in or check out
    if (req.method === "POST") {
      const body = await req.json();
      const { token, action } = body;

      if (!token || token.length < 10) {
        throw new HttpError("InvalidInput", "Invalid token", 400);
      }

      if (!["check_in", "check_out"].includes(action)) {
        throw new HttpError("InvalidInput", "Invalid action", 400);
      }

      const { data: assignment, error: fetchError } = await supabase
        .from("event_staff_assignments")
        .select("id, checked_in")
        .eq("check_in_token", token)
        .single();

      if (fetchError || !assignment) {
        throw new HttpError("NotFound", "Staff assignment not found", 404);
      }

      const now = new Date().toISOString();

      if (action === "check_in") {
        if (assignment.checked_in) {
          throw new HttpError("AlreadyCheckedIn", "Already checked in", 409);
        }

        const { error: updateError } = await supabase
          .from("event_staff_assignments")
          .update({ checked_in: true, checked_in_at: now, checked_out_at: null })
          .eq("id", assignment.id);

        if (updateError) throw new HttpError("DatabaseError", updateError.message, 500);

        return new Response(
          JSON.stringify({ success: true, checked_in: true, checked_in_at: now }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "check_out") {
        if (!assignment.checked_in) {
          throw new HttpError("NotCheckedIn", "Not checked in", 409);
        }

        const { error: updateError } = await supabase
          .from("event_staff_assignments")
          .update({ checked_in: false, checked_out_at: now })
          .eq("id", assignment.id);

        if (updateError) throw new HttpError("DatabaseError", updateError.message, 500);

        return new Response(
          JSON.stringify({ success: true, checked_in: false, checked_out_at: now }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    throw new HttpError("MethodNotAllowed", "Method not allowed", 405);
  } catch (error) {
    console.error(`[staff-check-in][${requestId}] Error:`, error);
    return errorResponse(error, {
      defaultType: "StaffCheckInError",
      requestId,
      headers: corsHeaders,
    });
  }
});
