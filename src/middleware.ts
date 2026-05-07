import { NextRequest, NextResponse } from 'next/server'

/**
 * Global middleware — runs on every request.
 *
 * Currently adds security headers to all responses.
 * Auth enforcement is handled per-route in API handlers
 * (too many intentionally public GET endpoints for blanket middleware auth).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // ── Security Headers ──
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // Remove server identification
  response.headers.delete('x-powered-by')

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files, _next, and api (api headers set by this middleware too)
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|workbox-*).*)',
  ],
}
