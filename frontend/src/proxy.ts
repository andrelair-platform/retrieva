import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
// Note: We use exact match for '/' to avoid matching all routes
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing', // public marketing — must be reachable without an account
  '/contact', // public marketing — must be reachable without an account
  '/q', // public vendor questionnaire form (no auth required)
  '/v', // public vendor evidence-upload form (token-based, no auth required)
];

// Admin-only paths
const adminPaths = ['/admin'];

/**
 * Decode JWT payload without verification (verification happens on backend)
 * This is just for route protection heuristics
 */
function decodeJWTPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// Auth-only public paths (redirect authenticated users away from these)
const authOnlyPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function matchesPath(paths: string[], pathname: string): boolean {
  return paths.some((path) => pathname.startsWith(path));
}

function getTokens(request: NextRequest) {
  return {
    accessToken: request.cookies.get('accessToken')?.value,
    refreshToken: request.cookies.get('refreshToken')?.value,
  };
}

function isTokenLive(payload: { exp?: number } | null): boolean {
  return !!payload?.exp && payload.exp * 1000 > Date.now();
}

// If on an auth page and the user is authenticated with a live token, redirect to the app home
// (the Command Center). Keep in sync with APP_HOME_ROUTE in shared/lib/navigation.
function authOnlyRedirect(request: NextRequest, accessToken: string | undefined): NextResponse | null {
  if (!accessToken) return null;
  if (!isTokenLive(decodeJWTPayload(accessToken))) return null;
  return NextResponse.redirect(new URL('/overview', request.url));
}

// If an admin path and the user is not an admin, redirect to home.
function adminRedirect(request: NextRequest, accessToken: string | undefined): NextResponse | null {
  if (!accessToken) return null;
  const payload = decodeJWTPayload(accessToken);
  if (payload?.role === 'admin') return null;
  return NextResponse.redirect(new URL('/', request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get tokens from cookies. The access token cookie lives 15 min; the refresh
  // token cookie lives 7 days. A present refresh token means the client can
  // silently mint a new access token — so an expired access token must NOT bounce
  // the user to login.
  const { accessToken, refreshToken } = getTokens(request);

  // Check if path is public (exact match for '/', startsWith for others)
  const isPublicPath = pathname === '/' || matchesPath(publicPaths, pathname);

  if (matchesPath(authOnlyPaths, pathname)) {
    const redirect = authOnlyRedirect(request, accessToken);
    if (redirect) return redirect;
  }

  // If protected path and the user has NO way to authenticate (neither a valid
  // access token nor a refresh token), redirect to login. When only the access
  // token is gone but a refresh token survives, let the request through — the
  // client's AuthProvider / axios interceptor will refresh transparently.
  if (!isPublicPath && !accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPath(adminPaths, pathname)) {
    const redirect = adminRedirect(request, accessToken);
    if (redirect) return redirect;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
