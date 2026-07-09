import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from HTTP-only cookie
  const token = request.cookies.get('token')?.value;

  // Verify JWT token with jose (Edge-safe)
  const payload = token ? await verifyJWT(token) : null;
  const isAuthenticated = !!payload;

  // If already logged in, redirect away from login/landing page to the board
  if (pathname === '/login' || pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/board', request.url));
    }
    // If not authenticated and visiting '/', redirect to login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Determine if path is protected (board, dashboard pages, and all non-auth API routes)
  const isProtectedRoute =
    pathname.startsWith('/board') ||
    pathname.startsWith('/dashboard') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'));

  if (isProtectedRoute) {
    if (!isAuthenticated) {
      // API routes get 401 JSON response
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized. Please login.' },
          { status: 401 }
        );
      }
      // Page routes redirect to /login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Config matcher to run proxy on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)',
  ],
};
