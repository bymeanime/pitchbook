'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronLeft, Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface Booking {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  effectivePrice: number
  platformFee: number
  notes: string | null
  isWalkIn: boolean
  confirmedBy: string | null
  confirmedAt: string | null
  rejectedBy: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  courtId: string
  createdAt: string
  court: {
    id: string
    name: string
    sport: string
    venue: { id: string; name: string; address: string; city: string }
  }
  members: { id: string; userId: string; amount: number; status: string; user: { id: string; name: string; email: string } }[]
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-amber-100 text-amber-800', icon: AlertCircle, label: 'Pending Approval' },
  confirmed: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Confirmed' },
  completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Cancelled' },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
}

export default function MyBookingsPage() {
  const { navigate, user, token } = useAppStore()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch('/api/bookings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load bookings')
        return res.json()
      })
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Failed to load bookings', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [user, token])

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    // Capture original status before optimistic update
    const originalStatus = bookings.find(b => b.id === bookingId)?.status || 'pending'
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'cancelled' })
      })
      if (!res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: originalStatus } : b))
        throw new Error('Failed to cancel')
      }
      toast({ title: 'Booking cancelled' })
    } catch {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: originalStatus } : b))
      toast({ title: 'Failed to cancel booking', variant: 'destructive' })
    } finally {
      setCancellingId(null)
    }
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Login to view your bookings</h2>
          <p className="text-sm text-muted-foreground mb-4">You need to be logged in to see your bookings</p>
          <Button onClick={() => navigate('login')}>Login</Button>
        </div>
      </div>
    )
  }

  const filteredBookings = filter ? bookings.filter(b => b.status === filter) : bookings

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-sm text-muted-foreground">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'].map(s => (
          <Button
            key={s || 'all'}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            className="capitalize text-xs"
            onClick={() => setFilter(s)}
          >
            {s || 'All'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-5"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No bookings found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filter ? 'No bookings with this status' : "You haven't made any bookings yet"}
          </p>
          <Button onClick={() => navigate('venues')}>Browse Venues</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const config = statusConfig[booking.status] || statusConfig.pending
            const StatusIcon = config.icon
            const courtName = booking.court?.name || 'Unknown Court'
            const venueName = booking.court?.venue?.name || 'Unknown Venue'
            const venueCity = booking.court?.venue?.city || ''
            const isCancelling = cancellingId === booking.id
            const showCancelButton = (booking.status === 'pending' || booking.status === 'confirmed') && !isCancelling

            return (
              <Card key={booking.id} className="hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{courtName}</h3>
                          <Badge className={config.color} style={{ colorScheme: undefined }}>
                            <StatusIcon className="w-3 h-3 mr-1" /> {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{venueName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {booking.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.startTime} - {booking.endTime}</span>
                          {venueCity && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {venueCity}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <p className="text-lg font-bold text-primary">Rs {booking.totalPrice.toLocaleString()}</p>
                      {booking.status === 'rejected' && booking.rejectionReason && (
                        <p className="text-xs text-red-500 mb-1">Reason: {booking.rejectionReason}</p>
                      )}
                      {isCancelling && (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">Cancelling...</span>
                        </div>
                      )}
                      {showCancelButton && (
                        <Button variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => handleCancel(booking.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
