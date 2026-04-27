import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy Layer
 * 
 * This replaces the deprecated middleware.ts pattern. Key differences:
 * 
 * 1. **Runtime**: Proxy runs with full Node.js APIs, middleware was Edge-runtime limited
 * 2. **Timing**: Proxy runs after route matching, middleware ran before
 * 3. **Response Access**: Proxy can read and modify response bodies, middleware couldn't
 * 4. **Streaming**: Proxy properly handles streaming responses, middleware buffered
 * 
 * For auth use cases like ours, proxy.ts provides the same functionality as middleware.ts
 * but with future-proofing for Next.js evolution.
 */
export async function proxy(request: NextRequest) {
  // Forward the pathname so Server Components can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // Create the base response
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Build a Supabase client that can set cookies on the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Preserve our x-pathname header when re-creating the response
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - required by @supabase/ssr
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/pending-approval') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/inbound-email');

  // If user is authenticated, check their approval status
  let isApproved = false;
  if (user) {
    const { data: approval } = await supabase
      .from('user_approvals')
      .select('status')
      .eq('user_id', user.id)
      .single();
    
    isApproved = approval?.status === 'approved';
    
    // Check if user is admin (chinwen.ao@gmail.com)
    const isAdmin = user.email === 'chinwen.ao@gmail.com';
    
    // Admin is always considered approved
    if (isAdmin) {
      isApproved = true;
      
      // Auto-approve admin if not already
      if (approval?.status !== 'approved') {
        await supabase
          .from('user_approvals')
          .upsert({
            user_id: user.id,
            email: user.email,
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user.id,
          }, { onConflict: 'user_id' });
      }
    }
  }

  // Redirect unauthenticated users to /login
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Redirect pending/unapproved users to /pending-approval
  // Except for the approval page itself and auth pages
  if (user && !isApproved && !isPublicPath) {
    const pendingUrl = request.nextUrl.clone();
    pendingUrl.pathname = '/pending-approval';
    return NextResponse.redirect(pendingUrl);
  }

  // Redirect authenticated & approved users away from /login
  if (user && isApproved && pathname === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  // Redirect approved users away from pending-approval
  if (user && isApproved && pathname === '/pending-approval') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * This pattern is recommended by Supabase for use with @supabase/ssr.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
