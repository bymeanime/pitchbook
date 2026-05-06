'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Building2, Calendar, DollarSign, Users, TrendingUp, Star,
  CheckCircle, XCircle, Clock, AlertCircle, BarChart3, Eye, EyeOff
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface VenueStat {
  id: string; name: string; city: string; isOpen: boolean; rating: number; totalReviews: number;
  courts: { id: string; name: string; sport: string; _count: { bookings: number } }[]
  _count: { reviews: number; tournaments: number }
}

interface OwnerBooking {
  id: string; date: string; startTime: string; endTime: string; status: string
  totalPrice: number; platformFee: number; notes: string | null
  courtName: string; venueName: string
  members: { id: string; amount: number; status: string; user: { name: string; email: string; phone: string | null } }[]
}

interface MonthlyData {
  [key: string]: { revenue: number; fees: number; count: number }
}

export default function OwnerDashboard() {
  const { user, token } = useAppStore()
  const { toast } = useToast()
  const [venues, setVenues] = useState<VenueStat[]>([])
  const [bookings, setBookings] = useState<OwnerBooking[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [monthly, setMonthly] = useState<MonthlyData>({})
  const [loading, setLoading] = useState(true)
  const [bookingFilter, setBookingFilter] = useState('')
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!user || !token) return
    setLoading(true)
    fetch('/api/owner/bookings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load bookings (${res.status})`)
        return res.json()
      })
      .then(data => {
        setVenues(Array.isArray(data.venues) ? data.venues : [])
        setBookings(Array.isArray(data.bookings) ? data.bookings : [])
      })
      .catch((err) => {
        toast({ title: err.message || 'Failed to load data', variant: 'destructive' })
        setVenues([])
        setBookings([])
      })
      .finally(() => setLoading(false))

    fetch('/api/owner/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load stats')
        return res.json()
      })
      .then(data => {
        setTotalRevenue(data.totalRevenue || 0)
        setMonthly(data.monthly || {})
      })
      .catch(() => toast({ title: 'Failed to load stats', variant: 'destructive' }))
      .finally(() => setStatsLoading(false))
  }, [user, token, toast])

  if (!user || (user.role !== 'venue_owner' && user.role !== 'admin')) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You need venue owner access to view this dashboard</p>
      </div>
    )
  }

  const filteredBookings = bookingFilter ? bookings.filter(b => b.status === bookingFilter) : bookings
  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
  const totalPlatformFees = bookings.reduce((sum, b) => sum + b.platformFee, 0)

  const statusConfig: Record<string, { color: string; icon: any }> = {
    pending: { color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
    confirmed: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
    completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
  }

  const handleToggleVenue = async (venueId: string, isOpen: boolean) => {
    try {
      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isOpen: !isOpen })
      })
      if (!res.ok) throw new Error('Failed')
      setVenues(prev => prev.map(v => v.id === venueId ? { ...v, isOpen: !isOpen } : v))
      toast({ title: `Venue ${!isOpen ? 'opened' : 'closed'}` })
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  const handleUpdateBooking = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
      toast({ title: `Booking ${status}` })
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage your venues, bookings, and revenue</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `Rs ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Bookings', value: totalBookings.toString(), icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Platform Fees', value: `Rs ${totalPlatformFees.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Venues', value: venues.length.toString(), icon: Building2, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={bookingFilter} onValueChange={setBookingFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All bookings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filteredBookings.length} bookings</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredBookings.map((booking) => {
              const config = statusConfig[booking.status] || statusConfig.pending
              const StatusIcon = config.icon
              return (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{booking.courtName}</p>
                            <Badge className={config.color} style={{ colorScheme: undefined }}>
                              <StatusIcon className="w-3 h-3 mr-1" /> <span className="capitalize">{booking.status}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.venueName} • {booking.date} • {booking.startTime}-{booking.endTime}
                          </p>
                          {booking.members?.[0]?.user?.name && booking.members?.[0]?.user?.email && (
                            <p className="text-xs text-muted-foreground">
                              By: {booking.members[0].user.name} ({booking.members[0].user.email})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <p className="font-semibold text-sm">Rs {booking.totalPrice}</p>
                        {booking.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => handleUpdateBooking(booking.id, 'confirmed')}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleUpdateBooking(booking.id, 'cancelled')}>
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {filteredBookings.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No bookings found</p>
            )}
          </div>
        </TabsContent>

        {/* Venues Tab */}
        <TabsContent value="venues" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <Card key={venue.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{venue.name}</h3>
                      <p className="text-xs text-muted-foreground">{venue.city}</p>
                    </div>
                    <Badge variant={venue.isOpen ? 'default' : 'secondary'} className="text-xs">
                      {venue.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{venue.courts.reduce((sum, c) => sum + c._count.bookings, 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Bookings</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{venue._count.reviews}</p>
                      <p className="text-[10px] text-muted-foreground">Reviews</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="flex items-center justify-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <p className="text-lg font-bold">{venue.rating}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Rating</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {venue.courts.length} courts: {venue.courts.map(c => c.name).join(', ')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggleVenue(venue.id, venue.isOpen)}
                  >
                    {venue.isOpen ? <><EyeOff className="w-3 h-3 mr-1" /> Close Venue</> : <><Eye className="w-3 h-3 mr-1" /> Open Venue</>}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(monthly).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(monthly)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, data]) => (
                      <div key={month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{month}</p>
                          <p className="text-xs text-muted-foreground">{data.count} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">Rs {data.revenue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Fees: Rs {data.fees.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">Rs {totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Revenue (All Time)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <TrendingUp className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">Rs {totalPlatformFees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Platform Fees (8% commission)</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
