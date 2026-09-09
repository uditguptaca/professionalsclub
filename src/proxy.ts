import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';

/**
 * Next.js 16 renamed the Middleware convention to Proxy; behaviour is unchanged.
 *
 * This is an optimistic check only — Next's own guidance is that this layer
 * "should not be used as a full session management or authorization solution".
 * It turns signed-out traffic away early so protected pages never begin
 * rendering. The authoritative checks are requireProfile()/requireAdmin() in the
 * portal server layouts, and RLS in the database under both.
 *
 * Note it does not decide admin-ness. Role lives in public.profiles, and a
 * database round trip per request belongs in the layout that already does one,
 * not here.
 */

// /portal/verify is where the emailed verification link lands, and the user
// arriving there has no session yet — gating it would bounce them straight back
// to sign-in and strand the flow.
const PUBLIC_PORTAL_PATHS = [
  '/portal/auth', '/portal/signup', '/portal/verify',
  // A locked-out member has no session by definition.
  '/portal/forgot-password', '/portal/reset-password',
];

const isPublicPortalPath = (pathname: string) =>
  PUBLIC_PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Server Actions arrive as POSTs. The redirect logic below is meaningless
  // for them (the action re-authenticates itself), and the SDK is allowed to
  // write cookies inside an action anyway — so skipping the session check
  // here removes a full auth round trip from every action call.
  if (request.method === 'POST') return NextResponse.next();

  // Runs on every page request, not just /portal. The proxy is the only
  // page-request layer Next lets write cookies, which matters because the SDK
  // relays a Set-Cookie whenever the auth service re-issues the session token;
  // doing that mid-render throws. This call is otherwise a plain read - it does
  // NOT warm the session-data cache on its own (the mint is gated on an
  // upstream Set-Cookie), which is why that cache is given a real TTL in
  // src/lib/auth/server.ts instead.
  //
  // Note what this cannot distinguish: `signedIn` is false both for a member
  // with no session AND for a member whose session could not be checked because
  // the auth service was unreachable. The redirect below therefore fires on a
  // transient failure too. That is survivable on the web (a reload fixes it)
  // and used to be destructive in the native shells, which read a /portal/auth
  // landing as a sign-out - so they no longer erase the cookie jar over it.
  const { data: session } = await auth.getSession();
  const signedIn = Boolean(session?.user?.id);

  if (!pathname.startsWith('/portal')) return NextResponse.next();

  if (isPublicPortalPath(pathname)) {
    // Members and admins both land on the member dashboard; the admin layout
    // moves admins on from there. Choosing the destination here would need the
    // profile role, and that lookup belongs in the layout.
    return signedIn
      ? NextResponse.redirect(new URL('/portal/member/dashboard', request.url))
      : NextResponse.next();
  }

  if (!signedIn) {
    const redirectTo = new URL('/portal/auth', request.url);
    redirectTo.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectTo);
  }

  return NextResponse.next();
}

export const config = {
  // All pages, minus API routes (handlers manage their own cookies) and
  // static assets (anything with a file extension, _next internals).
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
