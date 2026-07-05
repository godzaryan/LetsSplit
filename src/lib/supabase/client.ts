import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Use the Edge API proxy in the browser to bypass ISP blocks,
  // but fallback to the direct URL if running on the server.
  const supabaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/supabase-proxy`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-letssplit-auth-token',
      },
    }
  );
}
