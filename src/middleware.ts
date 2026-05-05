import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Only activate Clerk middleware when keys are configured
// Until then, pass through all requests without auth checks
const clerkMiddlewareEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/venues(.*)',
  '/api/tournaments(.*)',
  '/api/reviews(.*)',
  '/api/seed(.*)',
  '/api/auth(.*)',
  '/api/bookings(.*)',
  '/api/owner(.*)',
  '/api/admin(.*)',
  '/api/email(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

const handler = clerkMiddleware(async (auth, request) => {
  // No auth protection until Clerk keys are set — keep app accessible
  // Uncomment the line below when Clerk is activated:
  // if (!isPublicRoute(request)) { await auth.protect() }
})

// Wrap with a no-op fallback if Clerk isn't configured
export default clerkMiddlewareEnabled
  ? handler
  : async (_req: Request) => {
      // Pass through — no auth middleware
      return new Response(null, { status: 200 })
    }

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
