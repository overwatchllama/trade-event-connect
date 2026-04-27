import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createResendClient } from "../_shared/resend.ts";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Escape HTML to prevent XSS in email content
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface InvoiceRequest {
  applicationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    // Require authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new HttpError("MissingAuthHeader", "Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller's identity
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new HttpError("Unauthorized", "Unauthorized", 401);
    }

    const { applicationId }: InvoiceRequest = await req.json();

    if (!applicationId || typeof applicationId !== "string") {
      throw new HttpError("MissingFields", "Application ID is required", 400);
    }

    // Fetch the application with vendor and event data, and verify the caller is the event organizer
    const { data: application, error: appError } = await supabase
      .from("vendor_applications")
      .select(`
        id, requested_tables, approved_tables, application_status, payment_status, user_id,
        vendor:vendors!fk_vendor_applications_vendor_id(business_name, business_email),
        event:events!vendor_applications_event_id_fkey(title, organizer_id, vendor_table_price)
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      console.error(`[send-vendor-invoice][${requestId}] Application not found:`, appError);
      throw new HttpError("NotFound", "Application not found", 404);
    }

    // Authorization: only the event organizer can send invoices
    const event = application.event as any;
    const vendor = application.vendor as any;

    if (event.organizer_id !== user.id) {
      throw new HttpError("Forbidden", "Forbidden", 403);
    }

    // Validate application state
    if (application.application_status !== "approved") {
      throw new HttpError("Conflict", "Application must be approved to send invoice", 409);
    }

    const vendorEmail = vendor.business_email;
    if (!vendorEmail) {
      throw new HttpError("ValidationError", "Vendor has no email configured", 400);
    }

    // Compute invoice values server-side
    const vendorName = vendor.business_name;
    const eventTitle = event.title;
    const tableCount = application.approved_tables || application.requested_tables;
    const pricePerTable = event.vendor_table_price || 0;
    const totalAmount = pricePerTable * tableCount;

    const resend = createResendClient(Deno.env.get("RESEND_API_KEY"));

    console.log("Sending invoice for application:", applicationId);

    const emailResponse = await resend.emails.send({
      from: "Trading Card Events <onboarding@resend.dev>",
      to: [vendorEmail],
      subject: `Invoice for ${escapeHtml(eventTitle)} - Vendor Table Payment`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Invoice</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Trading Card Events</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-top: 0;">Hello ${escapeHtml(vendorName)},</p>
              
              <p style="font-size: 16px;">Your vendor application for <strong>${escapeHtml(eventTitle)}</strong> has been approved! Below is your invoice for the vendor table(s).</p>
              
              <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h2 style="margin: 0 0 15px 0; color: #667eea; font-size: 20px;">Invoice Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; font-weight: 500;">Event:</td>
                    <td style="padding: 12px 0; text-align: right;">${escapeHtml(eventTitle)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; font-weight: 500;">Number of Tables:</td>
                    <td style="padding: 12px 0; text-align: right;">${tableCount}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; font-weight: 500;">Price per Table:</td>
                    <td style="padding: 12px 0; text-align: right;">$${pricePerTable.toFixed(2)}</td>
                  </tr>
                  <tr style="background: #667eea; color: white;">
                    <td style="padding: 15px 10px; font-weight: bold; font-size: 18px; border-radius: 6px 0 0 6px;">Total Amount Due:</td>
                    <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px; border-radius: 0 6px 6px 0;">$${totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Payment Required</strong></p>
                <p style="margin: 5px 0 0 0; color: #92400e;">Please contact the event organizer to arrange payment for your vendor table(s).</p>
              </div>
              
              <p style="font-size: 16px;">We look forward to seeing you at the event!</p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                If you have any questions, please contact the event organizer directly.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p>Trading Card Events Platform</p>
              <p>This is an automated email, please do not reply directly to this message.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully for application:", applicationId);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-vendor-invoice function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send invoice" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
