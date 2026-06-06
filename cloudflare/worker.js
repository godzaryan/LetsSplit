/**
 * LetsSplit — Cloudflare Worker Proxy for Supabase
 * 
 * This worker proxies all requests to Supabase, handling CORS and
 * injecting the API key. This avoids ISP-level blocking of *.supabase.co.
 * 
 * Deploy: Copy this into Cloudflare Dashboard → Workers → letssplit-proxy → Edit Code
 * 
 * Environment Variables (set in Worker Settings → Variables):
 *   SUPABASE_URL = https://uzfbjpmmfxhmsdbyioyk.supabase.co
 *   SUPABASE_ANON_KEY = (your anon key)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const targetUrl = env.SUPABASE_URL + url.pathname + url.search;

    // Clone headers and inject apikey
    const headers = new Headers(request.headers);
    if (!headers.has('apikey')) {
      headers.set('apikey', env.SUPABASE_ANON_KEY);
    }

    // Remove headers that Cloudflare shouldn't forward
    headers.delete('host');

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
        redirect: 'manual',
      });

      // Clone response and add CORS headers
      const responseHeaders = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      // Rewrite Location header to keep traffic on the proxy
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        let location = responseHeaders.get('Location');
        if (location) {
          // Only rewrite direct redirects (e.g. email confirmations, magic links)
          // Do NOT rewrite encoded URLs (like redirect_uri for Google OAuth)
          // because Supabase backend hardcodes its own URL during the token exchange!
          if (location.startsWith(env.SUPABASE_URL)) {
             location = location.replace(env.SUPABASE_URL, url.origin);
          }
          responseHeaders.set('Location', location);
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy error', message: error.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
