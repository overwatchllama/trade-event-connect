/**
 * Smart CORS configuration that restricts origins to allowed domains
 * Usage: Replace hardcoded corsHeaders with getCorsHeaders(req)
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000', 
  'https://gsjwamfnoezhwlhkqzdn.supabase.co',
  // Add your production domain here when deploying
  // 'https://yourdomain.com',
];

export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  
  // Check if origin is in allowed list
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0]; // Default to localhost for dev

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
