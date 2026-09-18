import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createResendClient } from "../_shared/resend.ts";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const resend = createResendClient(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidShareUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    // Only allow URLs from our own domain
    const allowedHosts = [
      'collectorcompanion.lovable.app',
      'id-preview--a3c4ac8f-d60c-4517-8645-9de632618750.lovable.app',
      'localhost',
    ];
    return allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.lovable.app'));
  } catch {
    return false;
  }
}

interface ShareTicketRequest {
  recipientEmail: string;
  ticketCode: string;
  eventTitle?: string;
  eventDate?: string;
  shareUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpError("MissingAuthHeader", "Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      throw new HttpError("Unauthorized", "Unauthorized", 401);
    }

    const { recipientEmail, ticketCode, shareUrl }: ShareTicketRequest = await req.json();

    // Validate required fields
    if (!recipientEmail || !ticketCode || !shareUrl) {
      throw new HttpError("MissingFields", "Missing required fields", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail) || recipientEmail.length > 255) {
      throw new HttpError("InvalidEmail", "Invalid email address", 400);
    }

    // Validate shareUrl is from our domain
    if (!isValidShareUrl(shareUrl)) {
      throw new HttpError("InvalidUrl", "Invalid share URL", 400);
    }

    if (ticketCode.length > 100) {
      throw new HttpError("ValidationError", "Field value too long", 400);
    }

    // The share URL must point at the same ticket that is being shared
    if (!shareUrl.endsWith(`/ticket/${ticketCode}`)) {
      throw new HttpError("InvalidUrl", "Share URL does not match ticket", 400);
    }

    // SECURITY: the caller must own the ticket, and all email content is
    // sourced from the database rather than the request body.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('order_items')
      .select('id, user_id, ticket_code, event_id, event_day_id, ticket_type')
      .eq('ticket_code', ticketCode)
      .maybeSingle();

    if (ticketError || !ticket || ticket.user_id !== userData.user.id) {
      throw new HttpError("Forbidden", "Ticket not found or not yours to share", 403);
    }

    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('title, date')
      .eq('id', ticket.event_id)
      .maybeSingle();

    let resolvedDate: string = eventRow?.date ?? '';
    if (ticket.event_day_id) {
      const { data: dayRow } = await supabaseAdmin
        .from('event_days')
        .select('day_date')
        .eq('id', ticket.event_day_id)
        .maybeSingle();
      if (dayRow?.day_date) resolvedDate = dayRow.day_date;
    }

    // Escape all values for HTML embedding
    const safeEventTitle = escapeHtml(eventRow?.title ?? 'Your event');
    const safeEventDate = escapeHtml(resolvedDate);
    const safeTicketCode = escapeHtml(ticket.ticket_code);
    // shareUrl is validated above, but still escape for HTML attribute context
    const safeShareUrl = escapeHtml(shareUrl);

    console.log("Sending shared ticket email to:", recipientEmail);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Shared Ticket</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🎫 Ticket Shared With You!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 20px;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Someone shared their ticket with you for:
                      </p>
                      
                      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 20px;">${safeEventTitle}</h2>
                        <p style="color: #6b7280; margin: 0; font-size: 14px;">
                          📅 ${safeEventDate}
                        </p>
                      </div>
                      
                      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        Click the button below to view the ticket and QR code for entry.
                      </p>
                      
                      <a href="${safeShareUrl}" style="display: block; background: linear-gradient(135deg, #667eea, #764ba2); color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center;">
                        View Ticket
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        Ticket Code: <strong>${safeTicketCode}</strong>
                      </p>
                      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
                        Present the QR code at the venue for entry.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Trade Event Connect <noreply@trade-event-connect.lovable.app>",
      to: [recipientEmail],
      subject: `🎫 Ticket shared: ${safeEventTitle}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[share-ticket-email][${requestId}] Error:`, error);
    return errorResponse(error, {
      defaultType: "ShareTicketEmailError",
      requestId,
      headers: corsHeaders,
    });
  }
});
