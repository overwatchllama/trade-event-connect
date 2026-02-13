import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticketCode } = await req.json();

    if (!ticketCode || typeof ticketCode !== 'string') {
      throw new Error("Ticket code is required");
    }

    // Validate ticket code format (alphanumeric, reasonable length)
    const sanitizedCode = ticketCode.trim();
    if (sanitizedCode.length < 4 || sanitizedCode.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedCode)) {
      throw new Error("Invalid ticket code format");
    }

    console.log("Fetching shared ticket with validated code");

    // Use service role to bypass RLS for public ticket viewing
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch the ticket with event and day info
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
      console.error("Ticket not found:", error);
      throw new Error("Ticket not found");
    }

    // Transform the data (handle array vs object from Supabase)
    const transformedTicket = {
      ...ticket,
      event: Array.isArray(ticket.event) ? ticket.event[0] : ticket.event,
      event_day: Array.isArray(ticket.event_day) ? ticket.event_day[0] : ticket.event_day
    };

    console.log("Ticket found successfully");

    return new Response(
      JSON.stringify({ ticket: transformedTicket }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error("Error in get-shared-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
