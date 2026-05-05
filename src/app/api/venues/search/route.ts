import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') || ''
    const city = searchParams.get('city') || ''
    const query = searchParams.get('q') || ''
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined

    const where: any = { isOpen: true }

    if (sport) {
      where.sports = { contains: sport }
    }
    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } }
      ]
    }

    let venues = await db.venue.findMany({
      where,
      include: {
        courts: { select: { id: true, name: true, sport: true, pricePerHour: true, isIndoor: true } },
        _count: { select: { reviews: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Filter by price range on courts
    if (minPrice !== undefined || maxPrice !== undefined) {
      venues = venues.filter(v => {
        return v.courts.some(c => {
          if (minPrice !== undefined && c.pricePerHour < minPrice) return false
          if (maxPrice !== undefined && c.pricePerHour > maxPrice) return false
          return true
        })
      })
    }

    return NextResponse.json(venues)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
