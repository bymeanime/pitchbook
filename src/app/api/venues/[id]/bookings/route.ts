import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/venues/[id]/bookings?courtId=xxx&date=2025-06-10
// Returns bookings for a specific court on a specific date so the UI can
// highlight already-booked time slots in red.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const courtId = searchParams.get('courtId')
    const date = searchParams.get('date')

    if (!courtId || !date) {
      return NextResponse.json({ error: 'courtId and date are required' }, { status: 400 })
    }

    // Verify the court belongs to this venue
    const court = await db.court.findFirst({
      where: { id: courtId, venueId: id }
    })

    if (!court) {
      return NextResponse.json({ error: 'Court not found for this venue' }, { status: 404 })
    }

    // Get all bookings for this court on this date
    const bookings = await db.booking.findMany({
      where: {
        courtId,
        date,
        status: { in: ['pending', 'confirmed', 'completed'] }
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      }
    })

    return NextResponse.json(bookings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch bookings' }, { status: 500 })
  }
}
