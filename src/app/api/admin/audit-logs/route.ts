import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET — Admin views audit logs (paginated, filterable)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const actorId = searchParams.get('actorId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Record<string, any> = {}
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (actorId) where.actorId = actorId

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where })
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: unknown) {
    console.error('[Audit Logs]', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
