'use client'

import React from 'react'
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
  CheckCircle, XCircle, Clock, AlertCircle, BarChart3, Eye, EyeOff, RefreshCw, Plus, Trophy, Pencil
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import AddVenueDialog from '@/components/AddVenueDialog'
import EditVenueDialog from '@/components/EditVenueDialog'
import CreateTournamentDialog from '@/components/CreateTournamentDialog'
import PricingRulesPanel from '@/components/PricingRulesPanel'

// ── Error Boundary ──────────────────────────────────────────────
interface EBProps { children: React.ReactNode }
interface EBState { hasError: boolean; error: Error | null }
class OwnerErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Dashboard Error</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'Something went wrong loading the owner dashboard.'}
          </p>
          <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Types ──────────────────────────────────────────────────────
interface VenueStat {
  id: string; name: string; city: string; isOpen: boolean; rating: number
  courts?: { id: string; name: string; sport: string; _count?: { bookings: number } }[]
  _count?: { reviews: number; tournaments: number }
}

interface OwnerBooking {
  id: string; date: string; startTime: string; endTime: string; status: string
  totalPrice: number; platformFee: number; notes: string | null
  courtName: string; venueName: string
  members?: { id: string; amount: number; status: string; user?: { name: string; email: string; phone: string | null } }[]
}

interface MonthlyData {
  [key: string]: { revenue: number; fees: number; count: number }
}

// ── Main Component ─────────────────────────────────────────────
function OwnerDashboardInner() {
  const { user, token } = useAppStore()
  const { toast } = useToast()
  const [venues, setVenues] = useState<VenueStat[]>([])
  const [bookings, setBookings] = useState<OwnerBooking[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [monthly, setMonthly] = useState<MonthlyData>({})
  const [loading, setLoading] = useState(true)
  const [bookingFilter, setBookingFilter] = useState('all')
  const [addVenueOpen, setAddVenueOpen] = useState(false)
  const [editVenueId, setEditVenueId] = useState<string | null>(null)
  const [editVenueOpen, setEditVenueOpen] = useState(false)
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false)

  const loadData = useCallback(() => {
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
  }, [user, token])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Guard: not authorized ──
  if (!user || (user.role !== 'venue_owner' && user.role !== 'admin')) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You need venue owner access to view this dashboard</p>
      </div>
    )
  }

  // ── Derived data ──
  const safeBookings = Array.isArray(bookings) ? bookings : []
  const filteredBookings = bookingFilter && bookingFilter !== 'all' ? safeBookings.filter(b => b.status === bookingFilter) : safeBookings
  const totalBookings = safeBookings.length
  const confirmedBookings = safeBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
  const totalPlatformFees = safeBookings.reduce((sum, b) => sum + (b.platformFee || 0), 0)
  const safeVenues = Array.isArray(venues) ? venues : []

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Owner Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your venues, bookings, and revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddVenueOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Venue
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateTournamentOpen(true)}>
            <Trophy className="w-4 h-4 mr-1.5" /> Create Tournament
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `Rs ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Bookings', value: totalBookings.toString(), icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Platform Fees', value: `Rs ${totalPlatformFees.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Venues', value: safeVenues.length.toString(), icon: Building2, color: 'text-purple-600 bg-purple-50' },
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
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
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
                <SelectItem value="all">All</SelectItem>
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
                            <p className="text-sm font-medium">{booking.courtName || 'Unknown Court'}</p>
                            <Badge className={config.color} style={{ colorScheme: undefined }}>
                              <StatusIcon className="w-3 h-3 mr-1" /> <span className="capitalize">{booking.status}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.venueName || 'Unknown Venue'} &bull; {booking.date} &bull; {booking.startTime}-{booking.endTime}
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
            {safeVenues.map((venue) => {
              const courts = Array.isArray(venue.courts) ? venue.courts : []
              const totalCourtBookings = courts.reduce((sum, c) => sum + (c._count?.bookings || 0), 0)
              return (
                <Card key={venue.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{venue.name || 'Unknown Venue'}</h3>
                        <p className="text-xs text-muted-foreground">{venue.city || ''}</p>
                      </div>
                      <Badge variant={venue.isOpen ? 'default' : 'secondary'} className="text-xs">
                        {venue.isOpen ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center mb-3">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-lg font-bold">{totalCourtBookings}</p>
                        <p className="text-[10px] text-muted-foreground">Bookings</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-lg font-bold">{venue._count?.reviews || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Reviews</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <div className="flex items-center justify-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <p className="text-lg font-bold">{venue.rating || 0}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Rating</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {courts.length} courts: {courts.map(c => c.name).join(', ') || 'None'}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggleVenue(venue.id, venue.isOpen)}
                      >
                        {venue.isOpen ? <><EyeOff className="w-3 h-3 mr-1" /> Close</> : <><Eye className="w-3 h-3 mr-1" /> Open</>}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => { setEditVenueId(venue.id); setEditVenueOpen(true) }}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {safeVenues.length === 0 && (
              <p className="text-center text-muted-foreground py-8 col-span-2">No venues found</p>
            )}
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          {safeVenues.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Add a venue first to manage pricing rules</p>
          ) : token ? (
            <PricingRulesPanel
              venues={safeVenues.map(v => ({ id: v.id, name: v.name, city: v.city }))}
              token={token}
            />
          ) : null}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(monthly || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(monthly || {})
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, data]) => (
                      <div key={month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{month}</p>
                          <p className="text-xs text-muted-foreground">{data.count} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">Rs {(data.revenue || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Fees: Rs {(data.fees || 0).toLocaleString()}</p>
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

      {/* Dialogs */}
      <AddVenueDialog
        open={addVenueOpen}
        onOpenChange={setAddVenueOpen}
        onSuccess={loadData}
      />
      <EditVenueDialog
        open={editVenueOpen}
        onOpenChange={setEditVenueOpen}
        onSuccess={loadData}
        venueId={editVenueId}
      />
      <CreateTournamentDialog
        open={createTournamentOpen}
        onOpenChange={setCreateTournamentOpen}
        onSuccess={loadData}
      />
    </div>
  )
}

// ── Export with error boundary ──
export default function OwnerDashboard() {
  return (
    <OwnerErrorBoundary>
      <OwnerDashboardInner />
    </OwnerErrorBoundary>
  )
}
