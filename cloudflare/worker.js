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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-supabase-api-version, prefer, x-upsert',
  'Access-Control-Expose-Headers': 'content-range, x-supabase-api-version',
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
        redirect: 'follow',
      });

      // Clone response and add CORS headers
      const responseHeaders = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

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
