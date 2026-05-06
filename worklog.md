# PitchBook Development Worklog

---
Task ID: 0
Agent: Super Z (main)
Task: Phase 0 — Stabilize base for deployment. Fix all deployment-breaking errors and security issues.

Work Log:
- Cloned repo from GitHub (shallow clone with PAT auth)
- Analyzed entire codebase: Prisma schema, 20+ API routes, 10 page components, auth system, Clerk integration
- Identified root cause of build failure: Clerk's `useUser()` hook called during SSR prerendering without proper ClerkProvider context
- Fixed 6 Clerk-related deployment issues:
  1. `ClerkProvider.tsx` — Made conditional (pass-through when no Clerk key)
  2. `page.tsx` — Extracted ClerkSyncEffect into separate component, loaded with `dynamic({ ssr: false })`
  3. `Header.tsx` — Extracted ClerkHeaderSection into separate component, loaded with `dynamic({ ssr: false })`
  4. `sign-in/page.tsx` — Clerk SignIn loaded with `dynamic({ ssr: false })`, redirects to custom login when Clerk not configured
  5. `sign-up/page.tsx` — Clerk SignUp loaded with `dynamic({ ssr: false })`, redirects to custom register when Clerk not configured
  6. `clerk-sync/route.ts` — Added `CLERK_SECRET_KEY` check before importing Clerk
  7. `clerkDb.ts` — Added guard for missing Clerk key
  8. `syncClerkUser.ts` — Added guard for missing Clerk key
- Fixed security issue: Register route allowed role escalation (any user could self-assign `admin` role)
- Fixed authorization gap: Tournament POST endpoint missing role check (any authenticated user could create tournaments)
- Fixed DATABASE_URL crash: Changed from non-null assertion to explicit error message
- Added venue ownership verification to tournament creation
- Created new component files: `ClerkSyncEffect.tsx`, `ClerkHeaderSection.tsx`
- Verified: `npm install` succeeds (868 packages)
- Verified: `next build` succeeds (24/24 pages generated, zero errors)

Stage Summary:
- All deployment-blocking issues resolved
- Build passes cleanly on Next.js 16.1.3 (Turbopack)
- Clerk is now fully optional — app works without Clerk env vars
- Security: Role escalation and auth bypass issues fixed
- Ready for Phase 1 feature development

---
Task ID: 1
Agent: Super Z (main)
Task: Phase 1 — Booking confirmation flow + Dynamic pricing for Nepal venues

Work Log:
- Updated Prisma schema with new fields and model:
  - Booking model: added `isWalkIn`, `confirmedBy`, `confirmedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `cancelledBy`, `cancelledAt`, `cancellationReason`, `effectivePrice`
  - Payment model: default method changed from `card` to `cash` (Nepal pay-at-venue model)
  - New PricingRule model: supports flat price overrides, price multipliers, date/day/time triggers, validity periods, priority ordering
  - PricingRule relations added to Venue and Court models
- Created `src/lib/pricing.ts` — Dynamic pricing engine:
  - Price resolution: PricingRule flatPrice → PricingRule multiplier → TimeSlot override → Court base price
  - Nepal timezone handling (UTC+5:45) for day-of-week matching
  - Time-of-day window matching for morning/evening premium rates
  - `calculatePrice()` and `getPricePreview()` functions
- Updated booking API (`/api/bookings`):
  - POST: bookings now start as `pending` (was `confirmed`), payment as `cash/pending` (was `card/completed`)
  - POST: dynamic price calculation via pricing engine
  - PATCH: proper confirm/reject/cancel/complete state machine with authorization checks
  - DELETE: restricted to admin only (players/owners use cancel instead)
  - GET by ID: added ownership check (was missing before)
- Created pricing rules CRUD API (`/api/pricing-rules`): GET, POST, PATCH, DELETE
- Created price preview endpoint (`/api/venues/[id]/price-preview`): public, shows effective price before booking
- Updated VenueDetailPage:
  - Added price preview fetching when time slot selected
  - Shows dynamic pricing with rule breakdown (e.g., "Rs 800 × 1.5 = Rs 1200 (Saturday Premium)")
  - "Request Booking" instead of "Confirm Booking" (pending flow)
  - Loading state for price calculation
  - "Pay at venue" label
- Updated MyBookingsPage:
  - Added `rejected` status with badge and rejection reason display
  - Updated pending label to "Pending Approval"
  - Added all new booking fields to interface
- Fixed seed routes to include new `effectivePrice` field

Stage Summary:
- Build passes: 25/25 pages (2 new: pricing-rules, price-preview)
- Nepal-specific dynamic pricing engine fully implemented
- Booking flow: Player requests → Owner confirms/rejects → Player pays at venue
- No prepayment required (cash/pay-at-venue model)
- Price rules support: flat prices, multipliers, date-specific, day-of-week, time-of-day, validity periods
- NOTE: `prisma db push` must be run locally to apply schema changes to Supabase
