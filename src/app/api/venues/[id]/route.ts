import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const venue = await db.venue.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        courts: {
          include: { timeSlots: true },
          orderBy: { name: 'asc' }
        },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        tournaments: {
          orderBy: { startDate: 'desc' },
          take: 10
        },
        _count: { select: { tournaments: true } }
      }
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    return NextResponse.json(venue)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { parseSessionToken } = await import('@/lib/auth')
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const venue = await db.venue.findUnique({ where: { id } })
    if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    if (venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedFields = ['name', 'description', 'address', 'city', 'phone', 'email', 'website', 'amenities', 'sports', 'images', 'isOpen', 'isFeatured']
    const updates: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = field === 'amenities' || field === 'sports' || field === 'images'
          ? (typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]))
          : body[field]
      }
    }

    const updated = await db.venue.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
