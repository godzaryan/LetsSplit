import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check if a user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await supabase.auth.signOut();
    }
    
    // Redirect to the home page after clearing cookies
    const url = new URL('/', request.url);
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    console.error('Error during server-side sign out:', error);
    // Still redirect on error to ensure we leave the dashboard
    const url = new URL('/', request.url);
    return NextResponse.redirect(url, { status: 302 });
  }
}
