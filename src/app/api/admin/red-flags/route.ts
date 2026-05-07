import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

// GET — Admin lists red flags (filterable)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const isResolved = searchParams.get('isResolved')
    const flagType = searchParams.get('flagType')
    const severity = searchParams.get('severity')

    const where: Record<string, any> = {}
    if (isResolved !== null) where.isResolved = isResolved === 'true'
    if (flagType) where.flagType = flagType
    if (severity) where.severity = severity

    const redFlags = await db.redFlag.findMany({
      where,
      orderBy: [
        { isResolved: 'asc' },  // Unresolved first
        { createdAt: 'desc' }
      ]
    })

    // Attach entity names
    const enriched = await Promise.all(redFlags.map(async (flag) => {
      let entityName = 'Unknown'
      if (flag.entityType === 'user') {
        const user = await db.user.findUnique({ where: { id: flag.entityId }, select: { name: true, email: true } })
        entityName = user?.name || user?.email || 'Unknown'
      }
      return { ...flag, entityName }
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH — Resolve a red flag
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { id, resolutionNotes } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const existing = await db.redFlag.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Red flag not found' }, { status: 404 })

    const updated = await db.redFlag.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedBy: session.userId,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || null,
      }
    })

    await logAudit({
      entityType: 'red_flag',
      entityId: id,
      action: 'resolved',
      actorId: session.userId,
      actorRole: 'admin',
      oldValue: { isResolved: false },
      newValue: { isResolved: true, resolutionNotes },
      metadata: { flagType: existing.flagType, flaggedEntityId: existing.entityId }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
