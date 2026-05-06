'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  MapPin, Star, Clock, Phone, Mail, Globe, ChevronLeft,
  Calendar, Check, X as XIcon, Users, Shield, Car, Wifi,
  Coffee, ShowerHead, Zap, Sun, Moon, Award
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface TimeSlot {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
  price?: number | null
}

interface Court {
  id: string
  name: string
  sport: string
  surface?: string | null
  isIndoor: boolean
  pricePerHour: number
  timeSlots: TimeSlot[]
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  user: { id: string; name: string }
}

interface Venue {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  phone: string | null
  email: string | null
  website: string | null
  sports: string
  amenities: string
  rating: number
  totalReviews: number
  isFeatured: boolean
  commission: number
  images?: string
  owner: { id: string; name: string; email: string; phone: string | null }
  courts: Court[]
  reviews: Review[]
  tournaments: any[]
  _count?: { tournaments: number }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const amenityIcons: Record<string, any> = {
  parking: Car, wifi: Wifi, showers: ShowerHead, cafe: Coffee,
  scoreboard: Zap, led_lighting: Sun, changing_rooms: Shield
}

export default function VenueDetailPage() {
  const { selectedVenueId, navigate, user, token } = useAppStore()
  const { toast } = useToast()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'courts' | 'reviews'>('info')

  useEffect(() => {
    if (!selectedVenueId) return
    setLoading(true)
    fetch(`/api/venues/${selectedVenueId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load venue (${res.status})`)
        return res.json()
      })
      .then(data => {
        setVenue(data)
        if (data.courts?.length > 0) setSelectedCourt(data.courts[0])
      })
      .catch(() => toast({ title: 'Failed to load venue', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [selectedVenueId])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  if (loading || !venue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    )
  }

  const venueSports = JSON.parse(venue.sports || '[]')
  const venueAmenities = JSON.parse(venue.amenities || '[]')

  const getAvailableSlots = () => {
    if (!selectedCourt || !selectedDate) return []
    const date = new Date(selectedDate)
    const dayOfWeek = date.getDay()
    return selectedCourt.timeSlots
      .filter(s => s.dayOfWeek === dayOfWeek && s.isActive)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const handleBook = async () => {
    if (!user || !token) {
      toast({ title: 'Please login to book', variant: 'destructive' })
      navigate('login')
      return
    }
    if (!selectedCourt || !selectedSlot || !selectedDate) return

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          notes: bookingNotes
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Booking failed')
      }

      toast({ title: 'Booking confirmed!', description: `Booked ${selectedCourt.name} on ${selectedDate}` })
      setBookingDialogOpen(false)
      setSelectedSlot(null)
      setBookingNotes('')
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  const handleReview = async (rating: number, comment: string) => {
    if (!user || !token) {
      toast({ title: 'Please login to review', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ venueId: venue.id, rating, comment })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Review failed')
      toast({ title: 'Review submitted!' })
      // Reload venue
      const data = await fetch(`/api/venues/${selectedVenueId}`).then(r => r.json())
      setVenue(data)
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  const availableSlots = getAvailableSlots()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back button */}
      <Button variant="ghost" className="mb-4 gap-1" onClick={() => navigate('venues')}>
        <ChevronLeft className="w-4 h-4" /> Back to Venues
      </Button>

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        {(() => {
          const imgs = JSON.parse(venue.images || '[]')
          return imgs.length > 0 ? (
            <div className="relative aspect-[21/9] sm:aspect-[3/1]">
              <img src={imgs[0]} alt={venue.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                <div className="flex flex-wrap gap-2 mb-3">
                  {venueSports.map((s: string) => (
                    <Badge key={s} variant="secondary" className="capitalize bg-white/90 text-foreground">{s.replace('_', ' ')}</Badge>
                  ))}
                  {venue.isFeatured && <Badge className="bg-amber-500 text-white"><Award className="w-3 h-3 mr-1" /> Featured</Badge>}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">{venue.name}</h1>
                <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>{venue.address}, {venue.city}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-white">{venue.rating}</span>
                    <span>({venue.totalReviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{venue.courts.length} court{venue.courts.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {venueSports.map((s: string) => (
                      <Badge key={s} variant="secondary" className="capitalize">{s.replace('_', ' ')}</Badge>
                    ))}
                    {venue.isFeatured && <Badge className="bg-amber-500 text-white"><Award className="w-3 h-3 mr-1" /> Featured</Badge>}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">{venue.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{venue.address}, {venue.city}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-semibold">{venue.rating}</span>
                      <span className="text-muted-foreground">({venue.totalReviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{venue.courts.length} court{venue.courts.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 lg:items-end shrink-0">
                  {venue.phone && (
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-primary" /> {venue.phone}</div>
                  )}
                  {venue.email && (
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-primary" /> {venue.email}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Contact info bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
        {venue.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-primary" /> {venue.phone}</span>}
        {venue.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-primary" /> {venue.email}</span>}
        {venue.website && <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-primary" /> {venue.website}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(['info', 'courts', 'reviews'] as const).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'reviews' ? `Reviews (${venue.totalReviews})` : tab}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{venue.description || 'No description available.'}</p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="font-semibold mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {venueAmenities.map((a: string) => {
                  const Icon = amenityIcons[a] || Shield
                  return (
                    <div key={a} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm capitalize">{a.replace('_', ' ')}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Courts */}
            <div>
              <h2 className="font-semibold mb-3">Courts & Pricing</h2>
              <div className="space-y-2">
                {venue.courts.map((court) => (
                  <div key={court.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">{court.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {court.sport} • {court.isIndoor ? 'Indoor' : 'Outdoor'} • {court.surface || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">Rs {court.pricePerHour}</p>
                      <p className="text-xs text-muted-foreground">/hour</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base">Book This Venue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-1 block">Select Court</Label>
                  <Select value={selectedCourt?.id || ''} onValueChange={(id) => setSelectedCourt(venue.courts.find(c => c.id === id) || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a court" />
                    </SelectTrigger>
                    <SelectContent>
                      {venue.courts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} - Rs {c.pricePerHour}/hr
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Select Date</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>

                {selectedCourt && availableSlots.length > 0 && (
                  <div>
                    <Label className="text-xs mb-2 block">
                      Available Slots ({DAY_NAMES[new Date(selectedDate).getDay()]}, {selectedDate})
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot({ start: slot.startTime, end: slot.endTime })}
                          className={`text-xs p-2 rounded-lg border transition-all ${
                            selectedSlot?.start === slot.startTime
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-accent hover:border-primary/30'
                          }`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCourt && availableSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No available slots for this date</p>
                )}

                {selectedSlot && selectedCourt && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Court</span>
                      <span className="font-medium">{selectedCourt.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{selectedSlot.start} - {selectedSlot.end}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-primary text-lg">Rs {selectedCourt.pricePerHour}</span>
                    </div>
                  </div>
                )}

                <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={!selectedSlot || !selectedCourt}>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Booking
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Your Booking</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        You are booking <strong>{selectedCourt?.name}</strong> at <strong>{venue.name}</strong> on <strong>{selectedDate}</strong> from <strong>{selectedSlot?.start}</strong> to <strong>{selectedSlot?.end}</strong>.
                      </p>
                      <Textarea placeholder="Any special requests or notes..." value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} />
                      <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                        <span className="font-medium">Total Amount</span>
                        <span className="text-xl font-bold text-primary">Rs {selectedCourt?.pricePerHour || 0}</span>
                      </div>
                      <Button className="w-full" onClick={handleBook}>
                        Pay & Confirm Booking
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Courts Tab */}
      {activeTab === 'courts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {venue.courts.map((court) => (
            <Card key={court.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{court.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{court.sport} • {court.isIndoor ? 'Indoor' : 'Outdoor'}</p>
                  </div>
                  <span className="text-lg font-bold text-primary">Rs {court.pricePerHour}/hr</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((day, idx) => {
                    const slots = court.timeSlots.filter(s => s.dayOfWeek === idx && s.isActive)
                    return (
                      <div key={day} className="text-center">
                        <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                        <span className="block text-xs font-semibold">{slots.length > 0 ? `${slots[0].startTime}` : '-'}</span>
                        <span className="block text-[10px] text-muted-foreground">{slots.length > 0 ? `${slots[slots.length - 1].endTime}` : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Write review */}
          <ReviewForm onSubmit={handleReview} hasReview={venue.reviews.some((r: Review) => r.user.id === user?.id)} />

          {/* Reviews list */}
          <div className="space-y-3">
            {venue.reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No reviews yet. Be the first to review!</p>
            ) : (
              venue.reviews.map((review: Review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{review.user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{review.user.name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewForm({ onSubmit, hasReview }: { onSubmit: (rating: number, comment: string) => void; hasReview: boolean }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [hovered, setHovered] = useState(0)

  if (hasReview) return null

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">Write a Review</h3>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(s)}>
              <Star className={`w-6 h-6 transition-colors ${s <= (hovered || rating) ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />
            </button>
          ))}
        </div>
        <Textarea placeholder="Share your experience..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button size="sm" disabled={rating === 0} onClick={() => { onSubmit(rating, comment); setRating(0); setComment('') }}>
          Submit Review
        </Button>
      </CardContent>
    </Card>
  )
}
