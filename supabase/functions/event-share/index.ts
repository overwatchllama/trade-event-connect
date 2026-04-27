import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const redirect = url.searchParams.get("redirect");

    if (!id) {
      return new Response("Missing event id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: event, error } = await supabase
      .from("events")
      .select("id,title,description,venue_name,flyer_url")
      .eq("id", id)
      .single();

    if (error || !event) {
      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    const title = event.title ?? "Event";
    const desc = event.description || `Join us for ${title}${event.venue_name ? ` at ${event.venue_name}` : ""}.`;
    const image = event.flyer_url || `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/public/logo.jpg`;

    // Determine where to send users; prefer explicit redirect param
    const fallbackAppUrl = `${Deno.env.get("SUPABASE_URL")}`; // fallback only
    const targetUrl = redirect || `${fallbackAppUrl}/event/${id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - CC Events</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeAttr(targetUrl)}" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeAttr(targetUrl)}" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeAttr(image)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeAttr(image)}" />
  <meta http-equiv="refresh" content="0; url=${escapeAttr(targetUrl)}" />
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;padding:24px;text-align:center;color:#111}</style>
</head>
<body>
  <p>Redirecting to event… If you are not redirected, <a href="${escapeAttr(targetUrl)}">click here</a>.</p>
  <script>location.href = ${JSON.stringify(targetUrl)};</script>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });
  } catch (e) {
    // event-share returns HTML for OG crawlers; keep plaintext error body but
    // tag it with a request ID so logs can be correlated.
    const requestId = crypto.randomUUID();
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[event-share][${requestId}] Error:`, e);
    return new Response(`Error [${requestId}]: ${msg}`, { status: 500, headers: corsHeaders });
  }
});

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
