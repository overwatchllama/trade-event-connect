# Security Configuration Guide

This document provides security configuration instructions for the Trade Event Connect application.

## Table of Contents
1. [CORS Configuration](#cors-configuration)
2. [Security Headers](#security-headers)
3. [Rate Limiting](#rate-limiting)
4. [File Upload Security](#file-upload-security)
5. [Environment Variables](#environment-variables)

---

## CORS Configuration

### Supabase Functions
CORS is now restricted to allowed origins. Update the allowed origins in:
**File:** `supabase/functions/_shared/cors.ts`

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',          // Local development
  'http://localhost:3000',           // Alternative local port
  'https://gsjwamfnoezhwlhkqzdn.supabase.co',  // Supabase domain
  'https://yourdomain.com',          // Add your production domain here
];
```

**Action Required:**
- Add your production domain(s) to the `ALLOWED_ORIGINS` array before deploying

---

## Security Headers

Security headers have been configured for common hosting platforms.

### For Netlify/Cloudflare Pages
Headers are configured in `public/_headers` file. This file is automatically deployed.

### For Vercel
Headers are configured in `vercel.json` file. This file is automatically deployed.

### For Custom Hosting
Add these headers to your web server configuration (nginx, Apache, etc.):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Rate Limiting

### Supabase Edge Functions
Configure rate limiting in the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** → **Settings**
4. Configure rate limits:
   - **Recommended:** 100 requests per minute per IP
   - **Authenticated endpoints:** 50 requests per minute per user
   - **Public endpoints:** 10 requests per minute per IP

### Application-Level Rate Limiting
For additional protection, consider implementing client-side rate limiting using libraries like:
- `rate-limiter-flexible` (Node.js)
- Client-side request throttling

---

## File Upload Security

File upload validation is now enforced:

### Current Restrictions
- **Allowed Types:** JPEG, PNG, WebP, PDF
- **Max Size:** 
  - Images: 5MB
  - Floor Plans: 10MB
  - Event Files: 5MB

### Supabase Storage Buckets
Configure additional security in Supabase Dashboard:

1. Go to **Storage** → **Policies**
2. Ensure RLS policies are enabled for:
   - `event-flyers`
   - `event-floor-plans`
   - `event-files`

3. Recommended bucket settings:
   ```sql
   -- Only allow uploads from authenticated users
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'event-flyers');

   -- Only file owners can delete
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (auth.uid() = owner);
   ```

---

## Environment Variables

### Required Environment Variables

Create a `.env` file (never commit this):

```bash
VITE_SUPABASE_URL=https://gsjwamfnoezhwlhkqzdn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Production Deployment

#### Vercel
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

#### Netlify
Add in **Site Settings** → **Environment Variables**

#### Other Platforms
Consult your hosting provider's documentation for setting environment variables.

---

## Security Checklist

- [ ] Update `ALLOWED_ORIGINS` in `supabase/functions/_shared/cors.ts`
- [ ] Configure rate limiting in Supabase Dashboard
- [ ] Set up environment variables for production
- [ ] Review and test security headers (check with [securityheaders.com](https://securityheaders.com))
- [ ] Enable RLS policies on all Supabase storage buckets
- [ ] Configure file upload size limits in Supabase Storage settings
- [ ] Run security scan with `npm audit`
- [ ] Review admin operations (all use server-side verification)

---

## Reporting Security Issues

If you discover a security vulnerability, please email: security@yourdomain.com

**Do not** open public GitHub issues for security vulnerabilities.

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers](https://securityheaders.com/)
