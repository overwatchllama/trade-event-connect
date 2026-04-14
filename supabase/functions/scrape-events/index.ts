import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapedEvent {
  title: string;
  date: string;
  city: string;
  state: string;
  venue: string;
  image_url: string | null;
  source_url: string | null;
  description: string | null;
  address: string | null;
  entry_fee: number | null;
}

// Allowlisted domains for scraping
const ALLOWED_DOMAINS = [
  'ontreasure.com',
  'www.ontreasure.com',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Block non-HTTP(S) schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    // Check against allowlist
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

function parseEventsFromHtml(html: string, baseUrl: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const seen = new Set<string>();

  // Try to extract from Next.js __NEXT_DATA__ script
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      
      // Look for events array in pageProps
      const findEvents = (obj: any, depth = 0): any[] => {
        if (depth > 5 || !obj) return [];
        if (Array.isArray(obj)) {
          // Check if this array contains event-like objects
          if (obj.length > 0 && obj[0] && (obj[0].title || obj[0].name) && (obj[0].date || obj[0].start_date || obj[0].startDate)) {
            return obj;
          }
          for (const item of obj) {
            const result = findEvents(item, depth + 1);
            if (result.length > 0) return result;
          }
        }
        if (typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            const result = findEvents(obj[key], depth + 1);
            if (result.length > 0) return result;
          }
        }
        return [];
      };

      const rawEvents = findEvents(pageProps);
      for (const e of rawEvents) {
        const title = e.title || e.name || '';
        if (!title || seen.has(title)) continue;
        seen.add(title);
        
        const city = e.city || e.location?.city || '';
        const state = e.state || e.location?.state || '';
        const venue = e.venue || e.venue_name || e.location?.venue || '';
        const address = e.address || e.location?.address || '';
        const date = e.date || e.start_date || e.startDate || '';
        const slug = e.slug || e.id || '';
        
        events.push({
          title,
          date,
          city,
          state,
          venue,
          address: address || null,
          image_url: e.poster_url || e.image_url || e.image || e.flyer_url || null,
          source_url: slug ? `${baseUrl}/events/${slug}` : null,
          description: e.description || null,
          entry_fee: e.ticket_price || e.entry_fee || e.price || null,
        });
      }
      
      if (events.length > 0) return events;
    } catch (e) {
      console.log('Failed to parse __NEXT_DATA__, falling back to HTML parsing');
    }
  }

  // Fallback: parse from HTML structure using regex
  // Match patterns like: title\n\ndate\n\nlocation with links to event pages
  const linkPattern = /\[([^\]]*?)\]\((https?:\/\/[^\)]*?\/events\/[^\)]+)\)/g;
  
  // Alternative: look for structured text blocks
  // Pattern: image link followed by title, date, city/state
  const blockPattern = /\[!\[.*?\]\(.*?\)\\\\\n\\\\\n(.*?)\\\\\n\\\\\n(.*?)\\\\\n\\\\\n(.*?)\]\((https?:\/\/[^\)]+)\)/g;
  
  // Try to find event cards in the HTML directly
  // Look for anchor tags with event URLs
  const eventLinkRegex = /href="(\/events\/[^"]+)"/g;
  const titleRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  
  // Simple approach: find all event-like anchors and extract nearby text
  const cardRegex = /<a[^>]*href="(\/events\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  
  while ((match = cardRegex.exec(html)) !== null) {
    const eventPath = match[1];
    const cardContent = match[2];
    
    // Strip HTML tags to get text
    const text = cardContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (!text || text.length < 5) continue;
    
    // Try to extract title - usually the first meaningful text
    const lines = text.split(/\s{2,}/).map(s => s.trim()).filter(s => s.length > 2);
    
    if (lines.length === 0) continue;
    
    // Skip if we've seen an event with this path
    if (seen.has(eventPath)) continue;
    seen.add(eventPath);

    const title = lines[0] || '';
    let dateStr = '';
    let location = '';
    
    for (const line of lines.slice(1)) {
      if (/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line)) {
        dateStr = line;
      } else if (/[A-Z]{2}$/.test(line.trim()) || /,\s*[A-Z]{2}/.test(line)) {
        location = line;
      }
    }
    
    // Parse city, state from location
    let city = '';
    let state = '';
    if (location) {
      const parts = location.split(',').map(s => s.trim());
      city = parts[0] || '';
      state = parts[1] || '';
    }

    const origin = new URL(baseUrl).origin;
    
    events.push({
      title,
      date: dateStr,
      city,
      state,
      venue: '',
      address: null,
      image_url: null,
      source_url: `${origin}${eventPath}`,
      description: null,
      entry_fee: null,
    });
  }

  return events;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (formattedUrl.length > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate URL against allowlist to prevent SSRF
    if (!isAllowedUrl(formattedUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL domain is not allowed. Only supported event platforms can be scraped.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching URL:', formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CollectorCompanion/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL (${response.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const events = parseEventsFromHtml(html, formattedUrl);

    console.log(`Found ${events.length} events from ${formattedUrl}`);

    return new Response(
      JSON.stringify({ success: true, events, source_url: formattedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape events';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
