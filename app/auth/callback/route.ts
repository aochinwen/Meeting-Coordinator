import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Supabase Auth email confirmation and password reset callback.
 * After the user clicks the confirmation link in their email, Supabase
 * redirects here with a ?code= query param. We exchange it for a session.
 * 
 * For password recovery (type=recovery), redirects to /reset-password.
 * For email confirmation, redirects to the specified next URL or home.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const type = searchParams.get('type');

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery flow, redirect to reset-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password?code=${code}&type=recovery`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to login with an error message if the code is missing or invalid
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
