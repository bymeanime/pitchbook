import { db } from '@/lib/db'
import { getPricePreview } from '@/lib/pricing'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/venues/[id]/price-preview?courtId=xxx&date=2025-01-15&startTime=09:00&endTime=10:00
// Public endpoint — shows the effective price for a court/time slot before booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
    const { searchParams } = new URL(request.url)
    const courtId = searchParams.get('courtId')
    const date = searchParams.get('date')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')

    if (!courtId || !date || !startTime || !endTime) {
      return NextResponse.json({
        error: 'Missing required params: courtId, date, startTime, endTime'
      }, { status: 400 })
    }

    // Verify court belongs to this venue
    const court = await db.court.findFirst({
      where: { id: courtId, venueId },
      select: { id: true, name: true, pricePerHour: true, sport: true }
    })

    if (!court) {
      return NextResponse.json({ error: 'Court not found in this venue' }, { status: 404 })
    }

    const preview = await getPricePreview({
      courtId,
      venueId,
      date,
      startTime,
      endTime,
    })

    return NextResponse.json({
      court: {
        id: court.id,
        name: court.name,
        sport: court.sport,
        basePrice: court.pricePerHour,
      },
      ...preview,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
