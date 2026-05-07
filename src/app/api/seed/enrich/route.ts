import { db } from '@/lib/db'
import { NextResponse, NextRequest } from 'next/server'

// Protect enrich route — only works with SEED_SECRET env var
const SEED_SECRET = process.env.SEED_SECRET

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'Seed endpoint is disabled' }, { status: 404 })
    }
    // Verify seed secret to prevent unauthorized access
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized — seed endpoint is protected' }, { status: 401 })
    }
    const courts = await db.court.findMany()
    const players = await db.user.findMany({ where: { role: 'player' } })

    const extraBookings = [
      { ci: 3, date: '2025-06-15', start: '18:00', end: '19:00', ui: 5, status: 'confirmed' },
      { ci: 4, date: '2025-06-15', start: '19:00', end: '20:00', ui: 6, status: 'confirmed' },
      { ci: 9, date: '2025-06-16', start: '17:00', end: '18:00', ui: 7, status: 'pending' },
      { ci: 10, date: '2025-06-16', start: '06:00', end: '07:00', ui: 8, status: 'confirmed' },
      { ci: 14, date: '2025-06-17', start: '18:00', end: '19:00', ui: 9, status: 'confirmed' },
      { ci: 15, date: '2025-06-17', start: '07:00', end: '08:00', ui: 10, status: 'confirmed' },
      { ci: 20, date: '2025-06-18', start: '19:00', end: '20:00', ui: 11, status: 'confirmed' },
      { ci: 21, date: '2025-06-18', start: '20:00', end: '21:00', ui: 0, status: 'pending' },
      { ci: 25, date: '2025-06-19', start: '17:00', end: '18:00', ui: 1, status: 'confirmed' },
      { ci: 0, date: '2025-06-20', start: '18:00', end: '19:00', ui: 2, status: 'confirmed' },
      { ci: 1, date: '2025-06-21', start: '19:00', end: '20:00', ui: 3, status: 'confirmed' },
      { ci: 8, date: '2025-06-22', start: '18:00', end: '19:00', ui: 4, status: 'confirmed' },
      { ci: 16, date: '2025-06-22', start: '06:00', end: '07:00', ui: 5, status: 'completed' },
      { ci: 17, date: '2025-06-23', start: '07:00', end: '08:00', ui: 6, status: 'completed' },
      { ci: 22, date: '2025-06-23', start: '19:00', end: '20:00', ui: 7, status: 'confirmed' },
    ]

    let newBookings = 0
    for (const b of extraBookings) {
      const court = courts[b.ci]
      const user = players[b.ui % players.length]
      if (!court || !user) continue
      const existing = await db.booking.findFirst({ where: { courtId: court.id, date: b.date, startTime: b.start } })
      if (existing) continue
      const booking = await db.booking.create({
        data: { courtId: court.id, date: b.date, startTime: b.start, endTime: b.end, status: b.status, totalPrice: court.pricePerHour, effectivePrice: court.pricePerHour, platformFee: Math.round(court.pricePerHour * 0.08) }
      })
      await db.bookingMember.create({ data: { userId: user.id, bookingId: booking.id, amount: court.pricePerHour, status: 'paid' } })
      await db.payment.create({ data: { bookingId: booking.id, amount: court.pricePerHour, method: 'card', status: b.status === 'cancelled' ? 'refunded' : 'completed' } })
      newBookings++
    }

    // Add tournament matches
    const tournament = await db.tournament.findFirst({ where: { name: 'Kathmandu Futsal League 2025' }, include: { teams: true } })
    let newMatches = 0
    if (tournament && tournament.teams.length >= 4) {
      const existing = await db.tournamentMatch.count({ where: { tournamentId: tournament.id } })
      if (existing === 0) {
        const t = tournament.teams
        const qf = [
          { r: 1, m: 1, d: '2025-07-01', tm: '09:00', a: 0, b: 1 },
          { r: 1, m: 2, d: '2025-07-01', tm: '11:00', a: 2, b: 3 },
          { r: 1, m: 3, d: '2025-07-01', tm: '14:00', a: t.length > 4 ? 4 : 0, b: t.length > 5 ? 5 : 1 },
          { r: 1, m: 4, d: '2025-07-01', tm: '16:00', a: t.length > 6 ? 6 : 2, b: t.length > 7 ? 7 : 3 },
        ]
        for (const q of qf) {
          await db.tournamentMatch.create({
            data: { tournamentId: tournament.id, round: q.r, matchNumber: q.m, scheduledDate: q.d, scheduledTime: q.tm, teamAId: t[q.a].id, teamBId: t[q.b].id, courtId: courts[0]?.id, scoreA: q.m <= 2 ? (2 + Math.floor(Math.random() * 3)) : null, scoreB: q.m <= 2 ? (1 + Math.floor(Math.random() * 2)) : null, status: q.m <= 2 ? 'completed' : 'scheduled' }
          })
          newMatches++
        }
        const sf = [{ r: 2, m: 5, d: '2025-07-08', tm: '09:00', a: 0, b: 2 }, { r: 2, m: 6, d: '2025-07-08', tm: '11:00', a: 1, b: 3 }]
        for (const s of sf) {
          await db.tournamentMatch.create({ data: { tournamentId: tournament.id, round: s.r, matchNumber: s.m, scheduledDate: s.d, scheduledTime: s.tm, teamAId: t[s.a].id, teamBId: t[s.b].id, courtId: courts[0]?.id, status: 'scheduled' } })
          newMatches++
        }
        await db.tournamentMatch.create({ data: { tournamentId: tournament.id, round: 3, matchNumber: 7, scheduledDate: '2025-07-15', scheduledTime: '15:00', teamAId: t[0].id, teamBId: t[1].id, courtId: courts[0]?.id, status: 'scheduled' } })
        newMatches++
      }
    }

    const t2 = await db.tournament.findFirst({ where: { name: 'Weekend Warrior Badminton Open' }, include: { teams: true } })
    if (t2 && t2.teams.length >= 4) {
      const ex2 = await db.tournamentMatch.count({ where: { tournamentId: t2.id } })
      if (ex2 === 0) {
        for (let i = 0; i < Math.min(t2.teams.length, 8); i += 2) {
          if (i + 1 < t2.teams.length) {
            await db.tournamentMatch.create({ data: { tournamentId: t2.id, round: 1, matchNumber: Math.floor(i / 2) + 1, scheduledDate: '2025-06-20', scheduledTime: `${9 + Math.floor(i / 2) * 2}:00`, teamAId: t2.teams[i].id, teamBId: t2.teams[i + 1].id, courtId: courts.find(c => c.sport === 'badminton')?.id, status: 'scheduled' } })
            newMatches++
          }
        }
      }
    }

    return NextResponse.json({ message: 'Demo data enriched!', newBookings, newMatches, totalBookings: await db.booking.count(), totalMatches: await db.tournamentMatch.count() })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
