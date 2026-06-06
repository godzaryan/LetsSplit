import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    // Create the redirect response
    const url = new URL('/', request.url);
    const response = NextResponse.redirect(url, { status: 302 });
    
    // Explicitly delete all Supabase auth cookies as a fallback guarantee
    const allCookies = request.headers.get('cookie');
    if (allCookies) {
      const cookieArray = allCookies.split(';');
      cookieArray.forEach((cookie) => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName.startsWith('sb-')) {
          response.cookies.delete(cookieName);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('Error during server-side sign out:', error);
    const url = new URL('/', request.url);
    return NextResponse.redirect(url, { status: 302 });
  }
}
