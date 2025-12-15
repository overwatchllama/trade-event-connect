import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AnnouncementRequest {
  subject: string;
  message: string;
  roles: string[]; // Array of role IDs or ['all'] for all users
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[SEND-ANNOUNCEMENT] Auth error:", authError);
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdminResult, error: adminCheckError } = await supabase
      .rpc("is_admin", { user_id: user.id });

    if (adminCheckError || !isAdminResult) {
      console.error("[SEND-ANNOUNCEMENT] Not an admin:", user.id);
      throw new Error("Unauthorized - Admin access required");
    }

    console.log("[SEND-ANNOUNCEMENT] Admin verified:", user.id);

    // Parse request body
    const { subject, message, roles }: AnnouncementRequest = await req.json();

    if (!subject || !message || !roles || roles.length === 0) {
      throw new Error("Missing required fields: subject, message, and roles");
    }

    console.log("[SEND-ANNOUNCEMENT] Sending to roles:", roles);

    // Get recipients based on roles
    let recipients: { email: string; full_name: string | null }[] = [];

    if (roles.includes("all")) {
      // Get all users with communication enabled
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("communications_enabled", true);

      if (profilesError) {
        console.error("[SEND-ANNOUNCEMENT] Error fetching all profiles:", profilesError);
        throw profilesError;
      }

      recipients = profiles || [];
    } else {
      // Get users with specific roles and communication enabled
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", roles);

      if (rolesError) {
        console.error("[SEND-ANNOUNCEMENT] Error fetching user roles:", rolesError);
        throw rolesError;
      }

      const userIds = userRoles?.map(ur => ur.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .in("id", userIds)
          .eq("communications_enabled", true);

        if (profilesError) {
          console.error("[SEND-ANNOUNCEMENT] Error fetching profiles:", profilesError);
          throw profilesError;
        }

        recipients = profiles || [];
      }
    }

    console.log(`[SEND-ANNOUNCEMENT] Found ${recipients.length} recipients`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          recipientCount: 0,
          message: "No recipients found with communications enabled",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(req),
          },
        }
      );
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const emailResponse = await resend.emails.send({
          from: "CardEvents <onboarding@resend.dev>",
          to: [recipient.email],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${recipient.full_name || "there"}!</h2>
              <div style="margin: 20px 0; line-height: 1.6;">
                ${message.replace(/\n/g, "<br>")}
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                This is an announcement from CardEvents. 
                You can manage your email preferences in your profile settings.
              </p>
            </div>
          `,
        });

        console.log(`[SEND-ANNOUNCEMENT] Email sent to ${recipient.email}:`, emailResponse);
        return { success: true, email: recipient.email };
      } catch (error) {
        console.error(`[SEND-ANNOUNCEMENT] Failed to send to ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`[SEND-ANNOUNCEMENT] Sent ${successCount}/${recipients.length} emails successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        recipientCount: successCount,
        totalRecipients: recipients.length,
        results: results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(req),
        },
      }
    );
  } catch (error: unknown) {
    console.error("[SEND-ANNOUNCEMENT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: errorMessage === "Unauthorized" || errorMessage === "Unauthorized - Admin access required" ? 403 : 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(req),
        },
      }
    );
  }
};

serve(handler);
