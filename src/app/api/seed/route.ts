import { db } from '@/lib/db'
import { hashPassword, createSessionToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Protect seed route — only works with SEED_SECRET env var
const SEED_SECRET = process.env.SEED_SECRET

export async function POST(request: Request) {
  try {
    if (!process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'Seed endpoint is disabled' }, { status: 404 })
    }
    // Verify seed secret from request body (not URL params)
    const body = await request.json()
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized — seed endpoint is protected' }, { status: 401 })
    }
    // Seed admin user (do NOT overwrite password on update)
    const adminPassword = await hashPassword('admin123')
    const ownerPassword = await hashPassword('owner123')
    const playerPassword = await hashPassword('player123')

    const admin = await db.user.upsert({
      where: { email: 'admin@pitchbook.com' },
      update: {},
      create: {
        email: 'admin@pitchbook.com',
        password: adminPassword,
        name: 'Platform Admin',
        role: 'admin',
        phone: '+977-9800000000'
      }
    })

    // Seed venue owners
    const owners = [
      { email: 'arena@pitchbook.com', name: 'Arena Sports Complex', phone: '+977-9801111111' },
      { email: 'turf@pitchbook.com', name: 'City Turf Center', phone: '+977-9802222222' },
      { email: 'indoor@pitchbook.com', name: 'Indoor Sports Hub', phone: '+977-9803333333' },
      { email: 'elite@pitchbook.com', name: 'Elite Play Zone', phone: '+977-9804444444' },
      { email: 'community@pitchbook.com', name: 'Community Sports Center', phone: '+977-9805555555' },
    ]

    const ownerRecords: any[] = []
    for (const owner of owners) {
      const o = await db.user.upsert({
        where: { email: owner.email },
        update: {},
        create: {
          email: owner.email,
          password: ownerPassword,
          name: owner.name,
          role: 'venue_owner',
          phone: owner.phone
        }
      })
      ownerRecords.push(o)
    }

    // Seed players
    const playerNames = [
      'Raj Thapa', 'Sita Sharma', 'John Doe', 'Maya Gurung',
      'Binod Rai', 'Priya Karki', 'Alex Johnson', 'Nisha Tamang',
      'David Maharjan', 'Luna Shrestha', 'Chris Perry', 'Anita Basnet'
    ]

    const playerRecords: any[] = []
    for (const name of playerNames) {
      const email = name.toLowerCase().replace(/\s+/g, '.') + '@email.com'
      const p = await db.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: playerPassword,
          name,
          role: 'player'
        }
      })
      playerRecords.push(p)
    }

    // Seed venues
    const venueData = [
      {
        name: 'Arena Sports Complex',
        description: 'Premium futsal and multi-sport facility with world-class artificial turf, LED lighting, and modern amenities. Perfect for tournaments, league matches, and casual games. We offer 4 indoor futsal courts, 2 outdoor turf pitches, and a basketball court.',
        address: 'Thapathali, Kathmandu',
        city: 'Kathmandu',
        phone: '+977-9801111111',
        images: '[]',
        amenities: '["parking","wifi","showers","changing_rooms","cafe","scoreboard","led_lighting"]',
        sports: '["futsal","basketball","badminton"]',
        rating: 4.5,
        totalReviews: 28,
        isFeatured: true,
        ownerId: ownerRecords[0].id
      },
      {
        name: 'City Turf Center',
        description: 'The largest turf facility in the valley with 6 outdoor 5-a-side pitches and 2 full-size football grounds. Floodlit for night play, with on-site cafe and equipment rental available.',
        address: 'Balkhu, Kathmandu',
        city: 'Kathmandu',
        phone: '+977-9802222222',
        images: '[]',
        amenities: '["parking","cafe","equipment_rental","floodlights","viewing_gallery"]',
        sports: '["futsal","football","cricket"]',
        rating: 4.2,
        totalReviews: 19,
        isFeatured: true,
        ownerId: ownerRecords[1].id
      },
      {
        name: 'Indoor Sports Hub',
        description: 'Fully air-conditioned indoor facility featuring wooden courts for badminton, basketball, and futsal. Ideal for all weather conditions. Professional-grade surfaces and equipment available.',
        address: 'Lagankhel, Lalitpur',
        city: 'Lalitpur',
        phone: '+977-9803333333',
        images: '[]',
        amenities: '["parking","ac","changing_rooms","wifi","equipment_rental"]',
        sports: '["badminton","basketball","futsal","table_tennis"]',
        rating: 4.7,
        totalReviews: 35,
        isFeatured: true,
        ownerId: ownerRecords[2].id
      },
      {
        name: 'Elite Play Zone',
        description: 'State-of-the-art facility with FIFA-standard 5-a-side pitches, smart booking system, and professional coaching available. Host to the national futsal league. Premium changing rooms with hot showers.',
        address: 'Chabahil, Kathmandu',
        city: 'Kathmandu',
        phone: '+977-9804444444',
        images: '[]',
        amenities: '["parking","wifi","showers","changing_rooms","cafe","pro_shop","coaching"]',
        sports: '["futsal","football"]',
        rating: 4.8,
        totalReviews: 42,
        isFeatured: true,
        ownerId: ownerRecords[3].id
      },
      {
        name: 'Community Sports Center',
        description: 'Affordable community-focused sports facility with multi-purpose courts. Great for beginners, families, and casual players. Coaching programs for youth available at discounted rates.',
        address: 'Baneshwor, Kathmandu',
        city: 'Kathmandu',
        phone: '+977-9805555555',
        images: '[]',
        amenities: '["parking","water","changing_rooms"]',
        sports: '["futsal","badminton","volleyball","basketball"]',
        rating: 4.0,
        totalReviews: 15,
        isFeatured: false,
        ownerId: ownerRecords[4].id
      }
    ]

    const venueRecords: any[] = []
    for (const venue of venueData) {
      const existing = await db.venue.findFirst({ where: { name: venue.name } })
      let v: any
      if (existing) {
        v = existing
      } else {
        v = await db.venue.create({ data: venue })
      }
      venueRecords.push(v)
    }

    // Seed courts for each venue
    const courtConfigs = [
      // Arena Sports Complex
      { venueIdx: 0, courts: [
        { name: 'Futsal Court A', sport: 'futsal', isIndoor: true, pricePerHour: 1500 },
        { name: 'Futsal Court B', sport: 'futsal', isIndoor: true, pricePerHour: 1500 },
        { name: 'Futsal Court C', sport: 'futsal', isIndoor: true, pricePerHour: 1500 },
        { name: 'Futsal Court D', sport: 'futsal', isIndoor: true, pricePerHour: 1500 },
        { name: 'Basketball Court', sport: 'basketball', isIndoor: true, pricePerHour: 2000 },
        { name: 'Badminton Court 1', sport: 'badminton', isIndoor: true, pricePerHour: 800 },
        { name: 'Badminton Court 2', sport: 'badminton', isIndoor: true, pricePerHour: 800 },
      ]},
      // City Turf Center
      { venueIdx: 1, courts: [
        { name: 'Turf Pitch 1', sport: 'futsal', isIndoor: false, pricePerHour: 1200 },
        { name: 'Turf Pitch 2', sport: 'futsal', isIndoor: false, pricePerHour: 1200 },
        { name: 'Turf Pitch 3', sport: 'futsal', isIndoor: false, pricePerHour: 1200 },
        { name: 'Turf Pitch 4', sport: 'futsal', isIndoor: false, pricePerHour: 1200 },
        { name: 'Turf Pitch 5', sport: 'futsal', isIndoor: false, pricePerHour: 1200 },
        { name: 'Turf Pitch 6', sport: 'futsal', isIndoor: false, pricePerHour: 1200 },
        { name: 'Full Ground A', sport: 'football', isIndoor: false, pricePerHour: 5000 },
        { name: 'Full Ground B', sport: 'football', isIndoor: false, pricePerHour: 5000 },
      ]},
      // Indoor Sports Hub
      { venueIdx: 2, courts: [
        { name: 'Court 1 - Badminton', sport: 'badminton', isIndoor: true, pricePerHour: 1000 },
        { name: 'Court 2 - Badminton', sport: 'badminton', isIndoor: true, pricePerHour: 1000 },
        { name: 'Court 3 - Badminton', sport: 'badminton', isIndoor: true, pricePerHour: 1000 },
        { name: 'Court 4 - Badminton', sport: 'badminton', isIndoor: true, pricePerHour: 1000 },
        { name: 'Basketball Arena', sport: 'basketball', isIndoor: true, pricePerHour: 2500 },
        { name: 'Futsal Indoor', sport: 'futsal', isIndoor: true, pricePerHour: 1800 },
      ]},
      // Elite Play Zone
      { venueIdx: 3, courts: [
        { name: 'Elite Pitch 1', sport: 'futsal', isIndoor: false, pricePerHour: 2000 },
        { name: 'Elite Pitch 2', sport: 'futsal', isIndoor: false, pricePerHour: 2000 },
        { name: 'Elite Pitch 3', sport: 'futsal', isIndoor: false, pricePerHour: 2500 },
        { name: 'Football Ground', sport: 'football', isIndoor: false, pricePerHour: 6000 },
      ]},
      // Community Sports Center
      { venueIdx: 4, courts: [
        { name: 'Community Court A', sport: 'futsal', isIndoor: false, pricePerHour: 800 },
        { name: 'Community Court B', sport: 'futsal', isIndoor: false, pricePerHour: 800 },
        { name: 'Badminton Court', sport: 'badminton', isIndoor: true, pricePerHour: 600 },
        { name: 'Basketball Court', sport: 'basketball', isIndoor: true, pricePerHour: 1000 },
      ]},
    ]

    const allCourtRecords: any[] = []
    for (const config of courtConfigs) {
      const venueId = venueRecords[config.venueIdx].id
      for (const court of config.courts) {
        const existing = await db.court.findFirst({ where: { name: court.name, venueId } })
        if (existing) {
          allCourtRecords.push(existing)
          continue
        }
        const c = await db.court.create({
          data: { ...court, venueId, surface: court.isIndoor ? 'hardwood' : 'artificial_turf' }
        })
        allCourtRecords.push(c)
      }
    }

    // Seed time slots for each court (6AM to 10PM, 1-hour slots)
    const timeSlots = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

    for (const court of allCourtRecords) {
      const existingSlots = await db.timeSlot.findMany({ where: { courtId: court.id } })
      if (existingSlots.length > 0) continue

      for (let day = 0; day <= 6; day++) {
        // Peak hours: 17:00-21:00 (weekdays), 06:00-21:00 (weekends)
        for (let i = 0; i < timeSlots.length - 1; i++) {
          const startTime = timeSlots[i]
          const endTime = timeSlots[i + 1]
          let isActive = true

          // Courts closed 13:00-14:00 for maintenance (optional)
          if (startTime === '13:00') {
            continue
          }

          await db.timeSlot.create({
            data: {
              dayOfWeek: day,
              startTime,
              endTime,
              isActive,
              courtId: court.id
            }
          })
        }
      }
    }

    // Seed some bookings
    const today = new Date()
    const bookings = [
      { date: '2025-06-10', startTime: '18:00', endTime: '19:00', status: 'confirmed', courtIdx: 0, userIdx: 0, amount: 1500 },
      { date: '2025-06-10', startTime: '19:00', endTime: '20:00', status: 'confirmed', courtIdx: 1, userIdx: 1, amount: 1500 },
      { date: '2025-06-11', startTime: '17:00', endTime: '18:00', status: 'pending', courtIdx: 2, userIdx: 2, amount: 1500 },
      { date: '2025-06-12', startTime: '18:00', endTime: '19:00', status: 'confirmed', courtIdx: 8, userIdx: 3, amount: 1000 },
      { date: '2025-06-12', startTime: '09:00', endTime: '10:00', status: 'completed', courtIdx: 15, userIdx: 4, amount: 800 },
    ]

    for (const booking of bookings) {
      const courtId = allCourtRecords[booking.courtIdx].id
      const userId = playerRecords[booking.userIdx].id
      const commission = Math.round(booking.amount * 0.08)

      const existing = await db.booking.findFirst({ where: { courtId, date: booking.date, startTime: booking.startTime } })
      if (existing) continue

      const b = await db.booking.create({
        data: {
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          totalPrice: booking.amount,
          effectivePrice: booking.amount,
          platformFee: commission,
          courtId
        }
      })

      await db.bookingMember.create({
        data: { userId, bookingId: b.id, amount: booking.amount, status: 'paid' }
      })

      await db.payment.create({
        data: { bookingId: b.id, amount: booking.amount, method: 'card', status: 'completed' }
      })
    }

    // Seed tournaments
    const tournaments = [
      {
        name: 'Kathmandu Futsal League 2025',
        description: 'The biggest futsal tournament in Kathmandu featuring 16 teams competing for a grand prize. Open to all skill levels with group stage followed by knockout rounds. Professional referees and live scoring.',
        sport: 'futsal',
        format: 'knockout',
        maxTeams: 16,
        entryFee: 5000,
        prizePool: 50000,
        startDate: '2025-07-01',
        endDate: '2025-07-15',
        venueId: venueRecords[0].id,
        hostId: ownerRecords[0].id
      },
      {
        name: 'Weekend Warrior Badminton Open',
        description: 'A friendly badminton tournament for weekend players. Singles and doubles categories. Great prizes and refreshments provided. All equipment available on-site.',
        sport: 'badminton',
        format: 'round_robin',
        maxTeams: 32,
        entryFee: 2000,
        prizePool: 20000,
        startDate: '2025-06-20',
        endDate: '2025-06-22',
        venueId: venueRecords[2].id,
        hostId: ownerRecords[2].id
      },
      {
        name: 'Elite Cup Futsal Championship',
        description: 'Premium futsal championship on FIFA-standard pitches. Teams must have minimum 8 registered players. Live streaming, professional commentary, and extensive media coverage.',
        sport: 'futsal',
        format: 'league',
        maxTeams: 8,
        entryFee: 10000,
        prizePool: 100000,
        startDate: '2025-08-01',
        endDate: '2025-08-31',
        venueId: venueRecords[3].id,
        hostId: ownerRecords[3].id
      },
      {
        name: 'Community Basketball Jam',
        description: 'A community basketball tournament open to all. 3-on-3 format with street rules. Cash prizes, merchandise giveaways, and food trucks. Family-friendly event with activities for kids.',
        sport: 'basketball',
        format: 'knockout',
        maxTeams: 24,
        entryFee: 3000,
        prizePool: 30000,
        startDate: '2025-07-10',
        endDate: '2025-07-12',
        venueId: venueRecords[4].id,
        hostId: ownerRecords[4].id
      }
    ]

    for (const tournament of tournaments) {
      const existing = await db.tournament.findFirst({ where: { name: tournament.name } })
      if (existing) continue

      const t = await db.tournament.create({ data: tournament })

      // Add some registered teams
      const teamNames = ['Thunderbolts FC', 'Phoenix Rising', 'Street Kings', 'Night Wolves', 'Turbo FC', 'United Stars', 'Metro Warriors', 'Himalayan Eagles']
      const teamCount = Math.min(tournament.maxTeams, 4 + Math.floor(Math.random() * 4))

      for (let i = 0; i < teamCount && i < teamNames.length; i++) {
        await db.tournamentTeam.create({
          data: {
            name: teamNames[i],
            captainId: playerRecords[i % playerRecords.length].id,
            tournamentId: t.id
          }
        })
      }
    }

    // Seed reviews
    const reviewData = [
      { venueIdx: 0, userIdx: 0, rating: 5, comment: 'Amazing facility! The turf quality is top-notch and the LED lighting makes evening games incredible. The cafe serves great snacks too. Highly recommend for competitive matches.' },
      { venueIdx: 0, userIdx: 1, rating: 4, comment: 'Great courts but booking can be tricky during peak hours. The showers and changing rooms are clean and well-maintained. Staff is friendly and helpful.' },
      { venueIdx: 1, userIdx: 2, rating: 4, comment: 'Good value for money with 6 pitches available. The floodlights work well for night games. Cafe could be better but the pitches themselves are excellent quality.' },
      { venueIdx: 2, userIdx: 3, rating: 5, comment: 'Best indoor facility in the valley! Air-conditioned, great lighting, professional-grade surfaces. Perfect for badminton. The equipment rental is also reasonably priced.' },
      { venueIdx: 3, userIdx: 4, rating: 5, comment: 'FIFA-standard pitches with smart booking system. No double-booking issues at all! The pro shop has quality gear. Coaching programs are excellent for all skill levels.' },
      { venueIdx: 4, userIdx: 5, rating: 3, comment: 'Affordable and accessible but the facilities are basic. Good for casual games with friends. Youth coaching programs are well-organized and reasonably priced.' },
      { venueIdx: 0, userIdx: 6, rating: 5, comment: 'Hosted our company tournament here and it was perfect! Multiple courts allowed us to run simultaneous matches. The viewing gallery was great for spectators.' },
      { venueIdx: 3, userIdx: 7, rating: 4, comment: 'Premium quality comes at a premium price, but it is worth every rupee. The pitches are immaculately maintained. Booking system works flawlessly.' },
    ]

    for (const review of reviewData) {
      const venueId = venueRecords[review.venueIdx].id
      const userId = playerRecords[review.userIdx].id
      const existing = await db.review.findFirst({ where: { venueId, userId } })
      if (existing) continue

      await db.review.create({
        data: {
          rating: review.rating,
          comment: review.comment,
          userId,
          venueId
        }
      })
    }

    return NextResponse.json({
      message: 'Database seeded successfully!',
      stats: {
        users: await db.user.count(),
        venues: await db.venue.count(),
        courts: await db.court.count(),
        timeSlots: await db.timeSlot.count(),
        bookings: await db.booking.count(),
        tournaments: await db.tournament.count(),
        reviews: await db.review.count()
      }
    })
  } catch (error: unknown) {
    console.error('[Seed] error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
