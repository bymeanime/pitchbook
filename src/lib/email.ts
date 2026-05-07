import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface BookingEmailProps {
  to: string
  userName: string
  venueName: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  bookingId: string
}

export async function sendBookingConfirmation(props: BookingEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Resend] Skipping email — no API key configured')
    return { success: true, message: 'Email skipped (no API key)' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'PitchBook <onboarding@resend.dev>',
      replyTo: 'bymeanime@gmail.com',
      to: [props.to],
      subject: `Booking Confirmed: ${escapeHtml(props.venueName)} - ${escapeHtml(props.courtName)}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 700;">
              <span style="color: #16a34a;">&#9917;</span> Pitch<span style="color: #16a34a;">Book</span>
            </div>
          </div>
          
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 8px 0; color: #16a34a; font-size: 20px;">Booking Confirmed!</h2>
            <p style="margin: 0; color: #166534;">Your game venue has been booked successfully.</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Venue</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.venueName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Court</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.courtName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.date)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.startTime)} - ${escapeHtml(props.endTime)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #6b7280; font-size: 14px;">Total</td>
                <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #16a34a;">Rs ${props.totalPrice.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 12px; font-size: 13px; color: #6b7280; text-align: center;">
            Booking ID: <strong>${escapeHtml(props.bookingId.slice(0, 8).toUpperCase())}</strong> | 
            Show this at the venue reception
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>PitchBook — Book Instantly, Play Immediately</p>
            <p style="margin-top: 4px;">Kathmandu, Nepal</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('[Resend] Email error:', error)
      return { success: false, message: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err: any) {
    console.error('[Resend] Exception:', err)
    return { success: false, message: err.message }
  }
}

interface TournamentEmailProps {
  to: string
  userName: string
  tournamentName: string
  teamName: string
  venueName: string
  startDate: string
}

export async function sendTournamentRegistration(props: TournamentEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Resend] Skipping tournament email — no API key configured')
    return { success: true, message: 'Email skipped (no API key)' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'PitchBook <onboarding@resend.dev>',
      replyTo: 'bymeanime@gmail.com',
      to: [props.to],
      subject: `Tournament Registration: ${escapeHtml(props.tournamentName)}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 700;">
              <span style="color: #16a34a;">&#127942;</span> Pitch<span style="color: #16a34a;">Book</span>
            </div>
          </div>

          <div style="background: #fefce8; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 8px 0; color: #ca8a04; font-size: 20px;">You're Registered!</h2>
            <p style="margin: 0; color: #854d0e;">Your team &quot;${escapeHtml(props.teamName)}&quot; is now registered for the tournament.</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tournament</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.tournamentName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Your Team</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.teamName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Venue</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.venueName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Start Date</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(props.startDate)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>PitchBook — Book Instantly, Play Immediately</p>
            <p style="margin-top: 4px;">Kathmandu, Nepal</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('[Resend] Email error:', error)
      return { success: false, message: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err: any) {
    console.error('[Resend] Exception:', err)
    return { success: false, message: err.message }
  }
}
