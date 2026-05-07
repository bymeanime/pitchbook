'use client'

import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Shield, Users, Building2, Calendar, DollarSign, TrendingUp,
  Trophy, Star, BarChart3, Activity, Search, Eye, EyeOff,
  CheckCircle, XCircle, AlertCircle, UserCog, RefreshCw, Plus, Trash2, Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

// ── Error Boundary ──────────────────────────────────────────────
interface EBProps { children: React.ReactNode }
interface EBState { hasError: boolean; error: Error | null }
class AdminErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Dashboard Error</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'Something went wrong loading the admin dashboard.'}
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
interface AdminStats {
  totalUsers: number
  totalVenues: number
  totalBookings: number
  totalTournaments: number
  totalRevenue: number
  platformEarnings: number
  recentBookings?: any[]
  topVenues?: any[]
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  isVerified: boolean
  createdAt: string
  _count?: { bookings: number; ownedVenues: number; reviews: number }
}

interface AdminVenue {
  id: string
  name: string
  city: string
  isOpen: boolean
  rating: number
  totalReviews: number
  isFeatured: boolean
  createdAt: string
  owner?: { id: string; name: string; email: string }
  _count?: { courts: number; bookings: number; reviews: number; tournaments: number }
}

interface AdminBooking {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  platformFee: number
  createdAt: string
  court?: { id: string; name: string; venue?: { id: string; name: string; city: string } }
  members?: { id: string; userId: string; amount: number; status: string; user?: { id: string; name: string; email: string } }[]
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
  confirmed: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
}

// ── Main Component ─────────────────────────────────────────────
function AdminDashboardInner() {
  const { user, token } = useAppStore()
  const { toast } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [venues, setVenues] = useState<AdminVenue[]>([])
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCounts, setLoadingCounts] = useState({ stats: 0, users: 0, venues: 0, bookings: 0, holidays: 0 })
  const isLoading = Object.values(loadingCounts).some(v => v > 0)
  const [bookingFilter, setBookingFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')

  const isAdmin = user?.role === 'admin' && !!token

  // ── Holidays state ──
  const [holidays, setHolidays] = useState<any[]>([])
  const [holidayName, setHolidayName] = useState('')
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayType, setHolidayType] = useState('public')
  const [holidayRecurring, setHolidayRecurring] = useState(false)
  const [holidaySubmitting, setHolidaySubmitting] = useState(false)

  // Load holidays
  useEffect(() => {
    if (!isAdmin) return
    setLoadingCounts(prev => ({ ...prev, holidays: prev.holidays + 1 }))
    const year = new Date().getFullYear()
    fetch(`/api/admin/holidays?year=${year}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load holidays')
        return res.json()
      })
      .then(data => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]))
      .finally(() => setLoadingCounts(prev => ({ ...prev, holidays: prev.holidays - 1 })))
  }, [isAdmin, token])

  // Add holiday
  const handleAddHoliday = async () => {
    if (!holidayName.trim() || !holidayDate) {
      toast({ title: 'Name and date are required', variant: 'destructive' })
      return
    }
    setHolidaySubmitting(true)
    try {
      const dateParts = holidayDate.split('-')
      const payload: any = {
        name: holidayName.trim(),
        date: holidayDate,
        type: holidayType,
        isRecurring: holidayRecurring,
      }
      if (holidayRecurring) {
        payload.recurringMonth = parseInt(dateParts[1])
        payload.recurringDay = parseInt(dateParts[2])
      }
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add holiday')
      }
      toast({ title: 'Holiday added' })
      setHolidayName('')
      setHolidayDate('')
      setHolidayType('public')
      setHolidayRecurring(false)
      // Reload holidays
      const year = new Date().getFullYear()
      const updated = await fetch(`/api/admin/holidays?year=${year}`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (updated.ok) setHolidays(await updated.json())
    } catch (err: any) {
      toast({ title: err.message || 'Failed to add holiday', variant: 'destructive' })
    } finally {
      setHolidaySubmitting(false)
    }
  }

  // Delete holiday
  const handleDeleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/holidays?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed')
      setHolidays(prev => prev.filter(h => h.id !== id))
      toast({ title: 'Holiday deleted' })
    } catch {
      toast({ title: 'Failed to delete holiday', variant: 'destructive' })
    }
  }
  // Load stats
  useEffect(() => {
    if (!isAdmin) return
    setLoadingCounts(prev => ({ ...prev, stats: prev.stats + 1 }))
    fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load admin stats (${res.status})`)
        return res.json()
      })
      .then(data => setStats(data))
      .catch((err) => {
        toast({ title: err.message || 'Failed to load stats', variant: 'destructive' })
      })
      .finally(() => setLoadingCounts(prev => ({ ...prev, stats: prev.stats - 1 })))
  }, [isAdmin, token])

  // Load users
  useEffect(() => {
    if (!isAdmin) return
    setLoadingCounts(prev => ({ ...prev, users: prev.users + 1 }))
    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load users')
        return res.json()
      })
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Failed to load users', variant: 'destructive' }))
      .finally(() => setLoadingCounts(prev => ({ ...prev, users: prev.users - 1 })))
  }, [isAdmin, token])

  // Load venues
  useEffect(() => {
    if (!isAdmin) return
    setLoadingCounts(prev => ({ ...prev, venues: prev.venues + 1 }))
    fetch('/api/admin/venues', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load venues')
        return res.json()
      })
      .then(data => setVenues(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Failed to load venues', variant: 'destructive' }))
      .finally(() => setLoadingCounts(prev => ({ ...prev, venues: prev.venues - 1 })))
  }, [isAdmin, token])

  // Load all bookings
  useEffect(() => {
    if (!isAdmin) return
    setLoadingCounts(prev => ({ ...prev, bookings: prev.bookings + 1 }))
    fetch('/api/admin/bookings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load bookings')
        return res.json()
      })
      .then(data => setAllBookings(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Failed to load bookings', variant: 'destructive' }))
      .finally(() => setLoadingCounts(prev => ({ ...prev, bookings: prev.bookings - 1 })))
  }, [isAdmin, token])

  // Toggle venue open/close
  const handleToggleVenue = async (venueId: string, isOpen: boolean) => {
    try {
      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isOpen: !isOpen })
      })
      if (!res.ok) throw new Error('Failed to update venue')
      setVenues(prev => prev.map(v => v.id === venueId ? { ...v, isOpen: !isOpen } : v))
      toast({ title: `Venue ${!isOpen ? 'opened' : 'closed'}` })
    } catch {
      toast({ title: 'Failed to update venue', variant: 'destructive' })
    }
  }

  // Toggle venue featured status
  const handleToggleFeatured = async (venueId: string, isFeatured: boolean) => {
    try {
      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isFeatured: !isFeatured })
      })
      if (!res.ok) throw new Error('Failed to update venue')
      setVenues(prev => prev.map(v => v.id === venueId ? { ...v, isFeatured: !isFeatured } : v))
      toast({ title: `Venue ${!isFeatured ? 'featured' : 'unfeatured'}` })
    } catch {
      toast({ title: 'Failed to update venue', variant: 'destructive' })
    }
  }

  // Update booking status
  const handleUpdateBooking = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update booking')
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
      toast({ title: `Booking ${status}` })
    } catch {
      toast({ title: 'Failed to update booking', variant: 'destructive' })
    }
  }

  // Update user role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, role: newRole })
      })
      if (!res.ok) throw new Error('Failed to update role')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast({ title: `User role updated to ${newRole}` })
    } catch {
      toast({ title: 'Failed to update role', variant: 'destructive' })
    }
  }

  // ── Guard: not admin ──
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground">Only platform administrators can access this page</p>
      </div>
    )
  }

  // ── Guard: loading ──
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // ── Derived data ──
  const topVenues = Array.isArray(stats?.topVenues) ? stats.topVenues : []
  const recentBookings = Array.isArray(stats?.recentBookings) ? stats.recentBookings : []
  const filteredBookings = bookingFilter
    ? allBookings.filter(b => b.status === bookingFilter)
    : allBookings
  const filteredUsers = userSearch
    ? users.filter(u =>
        (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">Platform overview and management</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Venues', value: stats?.totalVenues ?? 0, icon: Building2, color: 'text-purple-600 bg-purple-50' },
          { label: 'Bookings', value: stats?.totalBookings ?? 0, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Tournaments', value: stats?.totalTournaments ?? 0, icon: Trophy, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total GMV', value: `Rs ${((stats?.totalRevenue ?? 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'Platform Rev', value: `Rs ${((stats?.platformEarnings ?? 0) / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              {['', 'confirmed', 'pending', 'completed', 'cancelled'].map(s => (
                <Button
                  key={s || 'all'}
                  variant={bookingFilter === s ? 'default' : 'outline'}
                  size="sm"
                  className="capitalize text-xs"
                  onClick={() => setBookingFilter(s)}
                >
                  {s || 'All'}
                </Button>
              ))}
            </div>
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
                            <p className="text-sm font-medium">{booking.court?.name || 'Unknown Court'}</p>
                            <Badge className={config.color} style={{ colorScheme: undefined }}>
                              <StatusIcon className="w-3 h-3 mr-1" /> <span className="capitalize">{booking.status}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.court?.venue?.name || 'Unknown Venue'} &bull; {booking.date} &bull; {booking.startTime}-{booking.endTime}
                          </p>
                          {booking.members?.[0]?.user?.name && (
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{(u.name || '?').charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{u.name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">{(u.role || 'player').replace('_', ' ')}</Badge>
                          {u.isVerified && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email || ''}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {u._count?.bookings ?? 0} bookings &bull; {u._count?.ownedVenues ?? 0} venues &bull; {u._count?.reviews ?? 0} reviews
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleUpdateRole(u.id, u.role === 'player' ? 'venue_owner' : 'player')}
                        >
                          <UserCog className="w-3 h-3 mr-1" />
                          Make {u.role === 'player' ? 'Owner' : 'Player'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No users found</p>
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{venue.name || 'Unknown Venue'}</h3>
                        {venue.isFeatured && <Badge className="bg-amber-500 text-white text-[10px]">Featured</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {venue.city || ''} &bull; Owner: {venue.owner?.name || 'Unknown'}
                      </p>
                    </div>
                    <Badge variant={venue.isOpen ? 'default' : 'secondary'} className="text-xs">
                      {venue.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">{venue._count?.courts ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Courts</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">{venue._count?.bookings ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Bookings</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">{venue._count?.reviews ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Reviews</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="flex items-center justify-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <p className="text-sm font-bold">{venue.rating || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleToggleVenue(venue.id, venue.isOpen)}
                    >
                      {venue.isOpen ? <><EyeOff className="w-3 h-3 mr-1" /> Close</> : <><Eye className="w-3 h-3 mr-1" /> Open</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleToggleFeatured(venue.id, venue.isFeatured)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {venue.isFeatured ? 'Unfeature' : 'Feature'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {venues.length === 0 && (
              <p className="text-center text-muted-foreground py-8 col-span-2">No venues found</p>
            )}
          </div>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manage Government Holidays</CardTitle>
              <p className="text-xs text-muted-foreground">Holidays are used for dynamic pricing. Venue owners can create pricing rules for specific dates.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Holiday Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-name">Holiday Name</Label>
                  <Input
                    id="holiday-name"
                    placeholder="e.g. Dashain"
                    value={holidayName}
                    onChange={e => setHolidayName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-date">Date</Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={holidayDate}
                    onChange={e => setHolidayDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={holidayType} onValueChange={setHolidayType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="religious">Religious</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <Checkbox checked={holidayRecurring} onCheckedChange={v => setHolidayRecurring(v === true)} />
                    Recurring yearly
                  </Label>
                  <Button onClick={handleAddHoliday} disabled={holidaySubmitting} className="w-full mt-3">
                    {holidaySubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Plus className="w-4 h-4 mr-1" /> Add Holiday
                  </Button>
                </div>
              </div>

              {/* Holidays List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No holidays added yet</p>
                ) : (
                  holidays.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{h.name}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{h.type}</Badge>
                            {h.isRecurring && (
                              <Badge className="bg-purple-100 text-purple-700 text-[10px]">Recurring</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{h.date}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteHoliday(h.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Venues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Top Venues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topVenues.length > 0 ? topVenues.map((venue: any, idx: number) => (
                  <div key={venue.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{venue.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{venue._count?.reviews || venue.totalReviews || 0} reviews</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-semibold">{venue.rating || 0}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-4">No venue data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Recent Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {recentBookings.length > 0 ? recentBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">
                        {booking.members?.[0]?.user?.name || 'User'} &rarr; {booking.court?.venue?.name || 'Venue'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.court?.name || 'Court'} &bull; {booking.date} &bull; {booking.startTime}-{booking.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">Rs {booking.totalPrice}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{booking.status}</Badge>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-4">No recent bookings</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-center">
                  <p className="text-3xl font-bold text-emerald-700">Rs {(stats?.totalRevenue ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-emerald-600 mt-1">Gross Merchandise Value</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total booking value across platform</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 text-center">
                  <p className="text-3xl font-bold text-amber-700">Rs {(stats?.platformEarnings ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-amber-600 mt-1">Platform Earnings (8%)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Commission from bookings</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-center">
                  <p className="text-3xl font-bold text-blue-700">
                    {(stats?.totalBookings ?? 0) > 0 ? `Rs ${Math.round((stats?.totalRevenue ?? 0) / (stats?.totalBookings ?? 1)).toLocaleString()}` : 'Rs 0'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">Avg. Booking Value</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue per booking</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Export with error boundary ──
export default function AdminDashboard() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardInner />
    </AdminErrorBoundary>
  )
}
