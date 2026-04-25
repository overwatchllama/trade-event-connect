import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketConfirmationRequest {
  orderId: string;
  userEmail: string;
  userName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, userEmail, userName }: TicketConfirmationRequest = await req.json();

    if (!orderId || !userEmail) {
      throw new Error("Missing required fields: orderId and userEmail");
    }

    console.log("Sending ticket confirmation to:", userEmail, "for order:", orderId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get order items with tickets
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select(`
        id,
        ticket_code,
        ticket_type,
        unit_price,
        event_id
      `)
      .eq("order_id", orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error("Error fetching order items:", itemsError);
      throw new Error("Could not find tickets for this order");
    }

    // Get event details with branding
    const eventId = orderItems[0].event_id;
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("title, date, venue, address, city, state, zip_code, brand_primary_color, brand_secondary_color, brand_logo_url, organizer_name")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Error fetching event:", eventError);
      throw new Error("Could not find event details");
    }

    // Use custom branding or defaults
    const primaryColor = event.brand_primary_color || "#667eea";
    const secondaryColor = event.brand_secondary_color || "#764ba2";
    const logoUrl = event.brand_logo_url;

    // Generate ticket HTML for each ticket
    const ticketHtml = orderItems.map((ticket, index) => `
      <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 15px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">Ticket ${index + 1} - ${ticket.ticket_type}</p>
        <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; margin: 10px 0;">
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.ticket_code)}" 
            alt="QR Code for ticket ${ticket.ticket_code}"
            style="width: 200px; height: 200px;"
          />
        </div>
        <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 18px; letter-spacing: 2px; color: #6b7280;">
          ${ticket.ticket_code}
        </p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">
          Present this QR code at entry
        </p>
      </div>
    `).join("");

    const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.unit_price), 0);

    // Build logo section if logo is provided
    const logoSection = logoUrl ? `
      <div style="margin-bottom: 15px;">
        <img 
          src="${logoUrl}" 
          alt="${event.title} logo"
          style="max-width: 150px; max-height: 80px; object-fit: contain;"
        />
      </div>
    ` : '';

    const emailResponse = await resend.emails.send({
      from: "Trading Card Events <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Your Tickets for ${event.title}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Event Tickets</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
            <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              ${logoSection}
              <h1 style="margin: 0; font-size: 28px;">🎟️ Your Tickets Are Ready!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your purchase${userName ? `, ${userName}` : ''}!</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px;">${event.title}</h2>
              
              <div style="background: #f0f9ff; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 0 0 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-weight: 600; color: #1e40af;">📅 ${event.date}</p>
                <p style="margin: 5px 0 0 0; color: #1e40af;">📍 ${event.venue}</p>
                <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 14px;">${event.address}, ${event.city}, ${event.state} ${event.zip_code}</p>
              </div>

              <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px;">Your Tickets (${orderItems.length})</h3>
              
              ${ticketHtml}

              <div style="border-top: 2px solid #e5e7eb; margin-top: 25px; padding-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 600; color: #374151;">Total Paid:</span>
                  <span style="font-weight: bold; font-size: 20px; color: #059669;">
                    ${totalAmount === 0 ? 'FREE' : `$${totalAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            <div style="background: #fef3c7; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">📱 Important Tips:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px;">
                <li>Screenshot or save this email for offline access</li>
                <li>Have your QR code ready when entering the venue</li>
                <li>Each ticket can only be scanned once</li>
                <li>You can also view tickets in your profile on our app</li>
              </ul>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Questions? Contact ${event.organizer_name || 'the event organizer'} directly.
              </p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                Trading Card Events Platform
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Ticket confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-ticket-confirmation function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});