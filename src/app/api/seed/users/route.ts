import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'

const SEED_SECRET = process.env.SEED_SECRET

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Seed endpoint is disabled in production' }, { status: 404 })
    }
    if (!process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'Seed endpoint is disabled' }, { status: 404 })
    }
    const body = await request.json()
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: { email: string; name: string; role: string }[] = []

    // Create admin (do NOT overwrite password on update)
    const adminPassword = await hashPassword('admin123')
    const admin = await db.user.upsert({
      where: { email: 'admin@pitchbook.com' },
      update: { name: 'Platform Admin', role: 'admin', isVerified: true },
      create: {
        email: 'admin@pitchbook.com',
        password: adminPassword,
        name: 'Platform Admin',
        role: 'admin',
        phone: '+977-9800000000',
        isVerified: true,
      },
    })
    results.push({ email: admin.email, name: admin.name, role: admin.role })

    // Create venue owners (do NOT overwrite password on update)
    const ownerPassword = await hashPassword('owner123')
    const owners = [
      { email: 'arena@pitchbook.com', name: 'Arena Sports Complex', phone: '+977-9801111111' },
      { email: 'turf@pitchbook.com', name: 'City Turf Center', phone: '+977-9802222222' },
      { email: 'indoor@pitchbook.com', name: 'Indoor Sports Hub', phone: '+977-9803333333' },
      { email: 'elite@pitchbook.com', name: 'Elite Play Zone', phone: '+977-9804444444' },
      { email: 'community@pitchbook.com', name: 'Community Sports Center', phone: '+977-9805555555' },
    ]

    for (const owner of owners) {
      const o = await db.user.upsert({
        where: { email: owner.email },
        update: { name: owner.name, role: 'venue_owner', isVerified: true },
        create: {
          email: owner.email,
          password: ownerPassword,
          name: owner.name,
          role: 'venue_owner',
          phone: owner.phone,
          isVerified: true,
        },
      })
      results.push({ email: o.email, name: o.name, role: o.role })
    }

    // Create some players (do NOT overwrite password on update)
    const playerPassword = await hashPassword('player123')
    const playerNames = [
      'Raj Thapa', 'Sita Sharma', 'John Doe', 'Maya Gurung',
      'Binod Rai', 'Priya Karki', 'Alex Johnson', 'Nisha Tamang',
      'David Maharjan', 'Luna Shrestha', 'Chris Perry', 'Anita Basnet',
    ]

    for (const name of playerNames) {
      const email = name.toLowerCase().replace(/\s+/g, '.') + '@email.com'
      const p = await db.user.upsert({
        where: { email },
        update: { name, isVerified: true },
        create: {
          email,
          password: playerPassword,
          name,
          role: 'player',
          isVerified: true,
        },
      })
      results.push({ email: p.email, name: p.name, role: p.role })
    }

    return NextResponse.json({
      message: 'Users seeded successfully!',
      users: results.length,
      details: results,
      totalInDb: await db.user.count(),
    })
  } catch (error: unknown) {
    console.error('[Seed Users] error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
