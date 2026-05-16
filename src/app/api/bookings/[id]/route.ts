import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit, checkRedFlags } from '@/lib/audit'
import { awardBookingPoints } from '@/lib/points'

// Helper: get fresh user role from DB (prevents stale JWT role after demotion)
async function getFreshRole(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role ?? null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        court: { include: { venue: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        payments: true
      }
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Authorization: only booking member, venue owner, or admin can view
    const isMember = booking.members.some(m => m.userId === session.userId)
    const isOwner = booking.court.venue.ownerId === session.userId
    if (!isMember && !isOwner && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(booking)
  } catch (error: unknown) {
    console.error('[Bookings] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const booking = await db.booking.findUnique({
      where: { id },
      include: { court: { include: { venue: true } } }
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const isMember = await db.bookingMember.findFirst({ where: { bookingId: id, userId: session.userId } })
    const isOwner = booking.court.venue.ownerId === session.userId
    const isAdmin = session.role === 'admin'

    // ── CONFIRM ──
    // Only venue owner or admin can confirm
    if (body.status === 'confirmed') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Only venue owner or admin can confirm bookings' }, { status: 403 })
      }
      // Verify fresh role from DB to prevent stale JWT role after demotion
      const freshRole = await getFreshRole(session.userId)
      if (freshRole !== 'venue_owner' && freshRole !== 'admin') {
        return NextResponse.json({ error: 'Only venue owner or admin can confirm bookings' }, { status: 403 })
      }
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: `Cannot confirm a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedBy: session.userId,
          confirmedAt: new Date(),
        }
      })

      // Payment stays 'pending' — customer pays cash at venue.
      // Payment will be marked 'completed' when owner marks booking as 'completed'.

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'confirmed' },
        metadata: { confirmedBy: session.userId }
      })

      return NextResponse.json(updated)
    }

    // ── REJECT ──
    // Only venue owner or admin can reject
    if (body.status === 'rejected') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Only venue owner or admin can reject bookings' }, { status: 403 })
      }
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: `Cannot reject a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectedBy: session.userId,
          rejectedAt: new Date(),
          rejectionReason: body.reason || null,
        }
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'rejected', reason: body.reason },
      })
      await checkRedFlags({
        entityType: 'booking', entityId: id,
        action: 'rejected', actorId: session.userId
      })

      return NextResponse.json(updated)
    }

    // ── CANCEL ──
    // Booking member (player) can cancel pending/confirmed bookings
    // Owner/admin can cancel any booking
    if (body.status === 'cancelled') {
      if (!isMember && !isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return NextResponse.json({ error: `Cannot cancel a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledBy: session.userId,
          cancelledAt: new Date(),
          cancellationReason: body.reason || null,
        }
      })

      // Mark payment as voided (cash-at-venue model — money was never collected)
      await db.payment.updateMany({
        where: { bookingId: id },
        data: { status: 'cancelled' }
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'cancelled', reason: body.reason },
      })
      await checkRedFlags({
        entityType: 'booking', entityId: id,
        action: 'cancelled', actorId: session.userId
      })

      return NextResponse.json(updated)
    }

    // ── COMPLETE ──
    // Owner/admin can mark a confirmed booking as completed (after the session)
    if (body.status === 'completed') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Only venue owner or admin can complete bookings' }, { status: 403 })
      }
      if (booking.status !== 'confirmed') {
        return NextResponse.json({ error: `Cannot complete a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: { status: 'completed' }
      })

      // Mark payment as completed (customer paid at venue after session)
      await db.payment.updateMany({
        where: { bookingId: id },
        data: { status: 'completed' }
      })

      // Update booking member status to paid
      await db.bookingMember.updateMany({
        where: { bookingId: id },
        data: { status: 'paid' }
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'completed' },
      })

      // Award loyalty points to booking members (online bookings only, not walk-in)
      if (!booking.isWalkIn) {
        const members = await db.bookingMember.findMany({
          where: { bookingId: id },
          select: { userId: true, amount: true }
        })
        for (const member of members) {
          // Check for existing points award to prevent double-award on concurrent requests
          const existingPoints = await db.pointsTransaction.findFirst({
            where: { bookingId: id, userId: member.userId, type: 'booking_completed' }
          })
          if (!existingPoints) {
            await awardBookingPoints({
              userId: member.userId,
              bookingId: id,
              amount: member.amount,
              isWalkIn: false
            })
          }
        }
      }

      return NextResponse.json(updated)
    }

    // ── ADMIN EDIT ──
    // Admin can edit booking details (date, time, notes, price)
    if (body.action === 'admin_edit' && isAdmin) {
      const { date, startTime, endTime, notes, totalPrice } = body
      const updateData: Record<string, any> = {}
      if (date !== undefined) updateData.date = date
      if (startTime !== undefined) updateData.startTime = startTime
      if (endTime !== undefined) updateData.endTime = endTime
      if (notes !== undefined) updateData.notes = notes
      if (totalPrice !== undefined) updateData.totalPrice = totalPrice

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }

      // Check for conflicts if date/time fields are changed
      if (date || startTime || endTime) {
        const checkDate = date || booking.date
        const checkStart = startTime || booking.startTime
        const checkEnd = endTime || booking.endTime
        const conflict = await db.booking.findFirst({
          where: {
            courtId: booking.courtId,
            date: checkDate,
            status: { in: ['pending', 'confirmed'] },
            id: { not: id },
            OR: [{ startTime: { lt: checkEnd }, endTime: { gt: checkStart } }]
          }
        })
        if (conflict) {
          return NextResponse.json({ error: 'The new time slot conflicts with an existing booking' }, { status: 409 })
        }
      }

      const updated = await db.booking.update({
        where: { id },
        data: updateData
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'admin_edit', actorId: session.userId, actorRole: 'admin',
        oldValue: { status: booking.status, date: booking.date, startTime: booking.startTime, endTime: booking.endTime },
        newValue: updateData,
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
  } catch (error: unknown) {
    console.error('[Bookings] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    // Only admin can hard-delete bookings
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can delete bookings. Use cancel instead.' }, { status: 403 })
    }

    const booking = await db.booking.findUnique({
      where: { id },
      include: { members: true },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    await db.$transaction([
      db.payment.deleteMany({ where: { bookingId: id } }),
      db.bookingMember.deleteMany({ where: { bookingId: id } }),
      db.booking.delete({ where: { id } }),
    ])

    return NextResponse.json({ message: 'Booking deleted' })
  } catch (error: unknown) {
    console.error('[Bookings] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }
}
