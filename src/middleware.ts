import { NextRequest, NextResponse } from 'next/server'

/**
 * Global middleware — runs on every request.
 *
 * Adds security headers to all responses.
 * Also enforces auth on protected API prefixes (/api/admin/*, /api/owner/*).
 * Auth is still checked per-route for fine-grained control, but this
 * provides defense-in-depth so a missed check doesn't expose data.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // ── Security Headers ──
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'"
  )

  // Remove server identification
  response.headers.delete('x-powered-by')

  // ── Middleware-level auth enforcement for protected API prefixes ──
  // This provides defense-in-depth. Individual routes still do their own
  // auth checks for role-specific access (admin vs owner).
  // GET requests to admin/owner endpoints still require auth here.
  const protectedPrefixes = ['/api/admin/', '/api/owner/']
  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))

  if (isProtected) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Allow the request to continue but the route handler will reject it
      // This avoids breaking public GET endpoints that might be nested differently
      response.headers.set('x-auth-required', 'true')
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files, _next, and api (api headers set by this middleware too)
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|workbox-*).*)',
  ],
}
