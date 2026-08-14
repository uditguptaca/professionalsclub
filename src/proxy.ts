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
const PUBLIC_PORTAL_PATHS = ['/portal/auth', '/portal/signup', '/portal/verify'];

const isPublicPortalPath = (pathname: string) =>
  PUBLIC_PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Runs on every page request, not just /portal. getSession() re-mints the
  // session-data cache cookie when it has gone stale (5 min TTL), and the
  // proxy is the only layer on a page request allowed to write cookies. The
  // root layout calls getSession() during render on every route; if the cache
  // were stale there, the SDK's refresh would try to write a cookie mid-render
  // and Next throws. Keeping the cache fresh here means render never writes.
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
