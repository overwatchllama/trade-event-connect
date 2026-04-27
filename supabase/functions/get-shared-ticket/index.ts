import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    let body: { ticketCode?: string };
    try {
      body = await req.json();
    } catch {
      throw new HttpError("InvalidJson", "Request body is not valid JSON", 400);
    }

    const { ticketCode } = body;
    if (!ticketCode || typeof ticketCode !== 'string') {
      throw new HttpError("MissingFields", "Ticket code is required", 400);
    }

    // Validate ticket code format (alphanumeric, reasonable length)
    const sanitizedCode = ticketCode.trim();
    if (sanitizedCode.length < 4 || sanitizedCode.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedCode)) {
      throw new HttpError("InvalidInput", "Invalid ticket code format", 400);
    }

    console.log(`[get-shared-ticket][${requestId}] Fetching shared ticket`);

    // Use service role to bypass RLS for public ticket viewing
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: ticket, error } = await supabaseAdmin
      .from("order_items")
      .select(`
        id,
        ticket_code,
        qr_data,
        ticket_type,
        checked_in,
        event_day_id,
        event_day:event_days(id, day_number, day_date, start_time, end_time),
        event:events(id, title, date, venue, city, state, is_multi_day, brand_primary_color, brand_secondary_color, brand_logo_url)
      `)
      .eq("ticket_code", sanitizedCode)
      .single();

    if (error || !ticket) {
      console.error(`[get-shared-ticket][${requestId}] Ticket not found:`, error);
      throw new HttpError("NotFound", "Ticket not found", 404);
    }

    const transformedTicket = {
      ...ticket,
      event: Array.isArray(ticket.event) ? ticket.event[0] : ticket.event,
      event_day: Array.isArray(ticket.event_day) ? ticket.event_day[0] : ticket.event_day,
    };

    return new Response(
      JSON.stringify({ ticket: transformedTicket }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[get-shared-ticket][${requestId}] Error:`, error);
    return errorResponse(error, {
      defaultType: "GetSharedTicketError",
      requestId,
      headers: corsHeaders,
    });
  }
});
