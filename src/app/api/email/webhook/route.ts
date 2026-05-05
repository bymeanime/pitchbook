import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Resend webhook events (delivered, bounced, etc.)
  // For now, just log them — can be expanded later
  try {
    const body = await request.json()
    console.log('[Email Webhook] Event:', body.type, body.data?.id)
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
