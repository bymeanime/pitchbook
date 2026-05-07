import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function seedUsers() {
  console.log('Seeding users...')

  const adminPassword = await bcrypt.hash('admin123', 12)
  const ownerPassword = await bcrypt.hash('owner123', 12)
  const playerPassword = await bcrypt.hash('player123', 12)

  // Admin
  const admin = await db.user.upsert({
    where: { email: 'admin@pitchbook.com' },
    update: { name: 'Platform Admin', role: 'admin', password: adminPassword, isVerified: true },
    create: {
      email: 'admin@pitchbook.com',
      password: adminPassword,
      name: 'Platform Admin',
      role: 'admin',
      phone: '+977-9800000000',
      isVerified: true,
    },
  })
  console.log('  Admin created:', admin.email)

  // Venue Owners
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
      update: { name: owner.name, role: 'venue_owner', password: ownerPassword, isVerified: true },
      create: {
        email: owner.email,
        password: ownerPassword,
        name: owner.name,
        role: 'venue_owner',
        phone: owner.phone,
        isVerified: true,
      },
    })
    console.log('  Owner created:', o.email)

    // Ensure subscription exists for each owner
    const existingSub = await db.subscription.findUnique({ where: { userId: o.id } })
    if (!existingSub) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 30)
      await db.subscription.create({
        data: {
          userId: o.id,
          tier: 'pro',
          status: 'trial',
          trialStartsAt: new Date(),
          trialEndsAt,
        }
      })
      console.log('  Subscription created for:', o.email)
    }
  }

  // Players
  const playerNames = [
    'Raj Thapa', 'Sita Sharma', 'John Doe', 'Maya Gurung',
    'Binod Rai', 'Priya Karki', 'Alex Johnson', 'Nisha Tamang',
  ]
  for (const name of playerNames) {
    const email = name.toLowerCase().replace(/\s+/g, '.') + '@email.com'
    await db.user.upsert({
      where: { email },
      update: { name, password: playerPassword, isVerified: true },
      create: { email, password: playerPassword, name, role: 'player', isVerified: true },
    })
  }

  const totalUsers = await db.user.count()
  console.log(`\nDone! Total users in DB: ${totalUsers}`)

  // Verify login would work
  const testAdmin = await db.user.findUnique({ where: { email: 'admin@pitchbook.com' } })
  const valid = await bcrypt.compare('admin123', testAdmin!.password)
  console.log(`Admin login test: ${valid ? 'PASS' : 'FAIL'}`)

  const testOwner = await db.user.findUnique({ where: { email: 'arena@pitchbook.com' } })
  const validOwner = await bcrypt.compare('owner123', testOwner!.password)
  console.log(`Owner login test: ${validOwner ? 'PASS' : 'FAIL'}`)
  console.log(`Owner role: ${testOwner!.role}`)

  await db.$disconnect()
}

seedUsers().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
