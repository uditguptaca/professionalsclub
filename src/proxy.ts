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
  // This used to be unable to tell two things apart: a member with NO session,
  // and a member whose session could not be CHECKED because the auth service
  // was slow, rate-limited or unreachable. Both read as signed out, so a blip
  // ejected people mid-task - three separate UX reviews caught it, as a member
  // losing a half-written help request, a volunteer's moderation queue showing
  // "Not signed in.", and a shop owner's coupon scanner failing at the till
  // with a customer waiting.
  //
  // The session token cookie tells them apart. If it is present, this browser
  // believes it is signed in, so a failed check is OUR problem, not evidence of
  // signing out: let the request through and let the layout decide. That is
  // safe because this layer was never the authority - requireProfile() and
  // requireAdmin() run in the portal layouts with RLS underneath them, and
  // Next's own guidance is that the proxy must not be the only authorization.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.endsWith('session_token') && Boolean(c.value));

  let session: Awaited<ReturnType<typeof auth.getSession>>['data'] = null;
  let checkFailed = false;
  try {
    session = (await auth.getSession()).data;
  } catch {
    checkFailed = true;
  }

  const signedIn = Boolean(session?.user?.id);
  // "We could not tell" - treat as signed in for routing, and let the layout
  // do the authoritative check.
  const unverifiable = !signedIn && hasSessionCookie && (checkFailed || !session);

  if (!pathname.startsWith('/portal')) return NextResponse.next();

  if (isPublicPortalPath(pathname)) {
    // Members and admins both land on the member dashboard; the admin layout
    // moves admins on from there. Choosing the destination here would need the
    // profile role, and that lookup belongs in the layout.
    //
    // A signed-in member the layout just sent HERE (?error=account_inactive: a
    // suspended account, or one with no profile row) must be allowed to read
    // the message. Bouncing them back made a loop the browser gave up on.
    const bounced = request.nextUrl.searchParams.has('error');
    // Only a confirmed session sends someone away from the sign-in screen; an
    // unverifiable one must not, or a member who really is signed out cannot
    // reach the form.
    return signedIn && !bounced
      ? NextResponse.redirect(new URL('/portal/member/dashboard', request.url))
      : NextResponse.next();
  }

  if (!signedIn && !unverifiable) {
    // The business console has its own front door: an owner who followed a
    // member's QR to /portal/business/redeem should not land on "Sign up as
    // Member".
    const door = pathname.startsWith('/portal/business') ? '/business/login' : '/portal/auth';
    const redirectTo = new URL(door, request.url);
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
