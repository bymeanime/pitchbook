# PitchBook — Game Venue Booking Platform

## Project Summary

Built a complete, production-ready MVP for a game venue booking platform inspired by travel booking apps like Booking.com but designed for sports venues (futsal, basketball, badminton, football, cricket, etc.).

---

## Architecture

### Technology Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite via Prisma ORM
- **State Management**: Zustand (client-side SPA routing)
- **Auth**: Custom token-based (SHA-256 hashing for MVP)

### Database Schema (12 Models)
- User (player/venue_owner/admin roles)
- Venue, Court, TimeSlot (venue & availability management)
- Booking, BookingMember, Payment (booking flow with split payments)
- Tournament, TournamentTeam, TournamentMatch (tournament brackets)
- Review (verified venue reviews)

### API Routes (12 endpoints)
- POST /api/auth/login, /api/auth/register
- GET/POST /api/venues, GET /api/venues/search, GET/PUT /api/venues/[id]
- GET/POST /api/bookings, GET/PATCH/DELETE /api/bookings/[id]
- GET/POST /api/tournaments, GET/PATCH /api/tournaments/[id], POST /api/tournaments/[id]/register
- POST /api/reviews
- GET /api/admin/stats, GET /api/owner/stats, GET /api/owner/bookings
- GET /api/seed (database seeder)

### UI Pages (10 views)
1. Home (hero, sports categories, featured venues, how it works, tournament preview, CTA)
2. Venues (search, filter by sport/city, grid listing)
3. Venue Detail (info, courts/schedule, booking sidebar with date/slot picker, reviews)
4. Tournaments (list with filters)
5. Tournament Detail (overview, teams, match brackets, registration)
6. My Bookings (player booking history with cancel)
7. Owner Dashboard (venues management, booking approval, revenue analytics)
8. Admin Dashboard (platform-wide metrics, top venues, recent bookings, revenue)
9. Login (with demo account quick-fill)
10. Register (player or venue owner)

### Seed Data
- 18 users (1 admin, 5 venue owners, 12 players)
- 5 venues with 29 courts and 2,842 time slots
- 5 sample bookings, 4 tournaments with teams, 8 reviews

### Monetization Strategy
1. **Commission per booking**: 8% platform fee on each transaction
2. **Premium listings**: Featured venue badges for higher visibility
3. **Tournament fees**: Commission on tournament entry fees
4. **Subscription (future)**: Advanced analytics for venue owners

### Demo Accounts
- **Player**: player123@email.com / player123
- **Venue Owner**: arena@pitchbook.com / owner123
- **Admin**: admin@pitchbook.com / admin123
