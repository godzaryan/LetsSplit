import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// We pull the real Supabase URL directly from the environment variables.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function handleRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Await the params resolution for Next.js 15+ compatibility
  const resolvedParams = await params;
  
  const url = new URL(request.url);
  url.searchParams.delete('path'); // Next.js often injects dynamic route parameters into the query string

  // Construct the target URL using the path array and original search parameters
  const targetPath = resolvedParams.path ? resolvedParams.path.join('/') : '';
  const targetUrl = `${SUPABASE_URL}/${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  // Remove host so the fetch uses the target URL's host naturally
  headers.delete('host');

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual', // Intercept redirects so we can rewrite the Location header
    });

    const responseHeaders = new Headers(response.headers);

    // If Supabase sends a redirect (e.g. OAuth callbacks, Magic Links)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      let location = responseHeaders.get('Location');
      if (location) {
        // Rewrite Supabase's URL to our proxy URL so the browser doesn't try to visit the banned domain
        if (location.startsWith(SUPABASE_URL)) {
          location = location.replace(SUPABASE_URL, `${url.origin}/api/supabase-proxy`);
        }
        responseHeaders.set('Location', location);
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Proxy error', message: error.message },
      { status: 502 }
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
