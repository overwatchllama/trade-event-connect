import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementRequest {
  eventId: string;
  title: string;
  message: string;
  targetAudience: 'vendors' | 'attendees' | 'both';
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send announcement function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { eventId, title, message, targetAudience }: AnnouncementRequest = await req.json();
    console.log('Processing announcement:', { eventId, title, targetAudience });

    // Verify user is the event organizer
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('organizer_id', user.id)
      .single();

    if (eventError || !event) {
      console.error('Event access error:', eventError);
      return new Response(JSON.stringify({ error: 'Event not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save announcement to database
    const { data: announcement, error: saveError } = await supabaseClient
      .from('event_announcements')
      .insert({
        event_id: eventId,
        organizer_id: user.id,
        title,
        message,
        target_audience: targetAudience,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving announcement:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save announcement' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recipient emails based on target audience
    let recipientEmails: string[] = [];
    
    if (targetAudience === 'vendors' || targetAudience === 'both') {
      // Get vendor emails from applications
      const { data: vendorApplications } = await supabaseClient
        .from('vendor_applications')
        .select(`
          user_id,
          profiles:user_id (email)
        `)
        .eq('event_id', eventId)
        .eq('application_status', 'approved');

      if (vendorApplications) {
        const vendorEmails = vendorApplications
          .map(app => app.profiles?.email)
          .filter(Boolean) as string[];
        recipientEmails.push(...vendorEmails);
      }
    }

    // For attendees, we would need an attendees table or registration system
    // For now, we'll just handle vendors

    if (recipientEmails.length === 0) {
      console.log('No recipients found for announcement');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Announcement saved but no recipients found',
        announcementId: announcement.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send emails using Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    try {
      const emailResults = await Promise.allSettled(
        recipientEmails.map(email => 
          resend.emails.send({
            from: 'Events <onboarding@resend.dev>',
            to: [email],
            subject: `${event.title} - ${title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                  ${event.title}
                </h1>
                <h2 style="color: #666;">${title}</h2>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                  <p><strong>Event Details:</strong></p>
                  <p>📅 ${event.date}</p>
                  <p>📍 ${event.venue}, ${event.address}</p>
                  <p>Organized by: ${event.organizer_name}</p>
                </div>
              </div>
            `,
          })
        )
      );

      const successCount = emailResults.filter(result => result.status === 'fulfilled').length;
      const failureCount = emailResults.filter(result => result.status === 'rejected').length;

      console.log(`Email sending complete: ${successCount} sent, ${failureCount} failed`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Announcement sent to ${successCount} recipients`,
        announcementId: announcement.id,
        emailStats: { sent: successCount, failed: failureCount }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Announcement saved but email sending failed',
        announcementId: announcement.id,
        emailError: emailError.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);