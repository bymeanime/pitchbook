'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Shield, Users, Building2, Calendar, DollarSign, TrendingUp,
  Trophy, Star, BarChart3, Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface AdminStats {
  totalUsers: number
  totalVenues: number
  totalBookings: number
  totalTournaments: number
  totalRevenue: number
  platformEarnings: number
  recentBookings: any[]
  topVenues: any[]
}

export default function AdminDashboard() {
  const { user, token } = useAppStore()
  const { toast } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const isAdmin = user?.role === 'admin' && !!token
  const loading = isAdmin && !stats

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load admin stats (${res.status})`)
        return res.json()
      })
      .then(data => setStats(data))
      .catch((err) => {
        toast({ title: err.message || 'Failed to load', variant: 'destructive' })
      })
  }, [isAdmin, token, toast])

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground">Only platform administrators can access this page</p>
      </div>
    )
  }

  if (loading || !stats) {
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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Venues', value: stats.totalVenues, icon: Building2, color: 'text-purple-600 bg-purple-50' },
          { label: 'Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Tournaments', value: stats.totalTournaments, icon: Trophy, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total GMV', value: `Rs ${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'Platform Rev', value: `Rs ${(stats.platformEarnings / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Venues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Top Venues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topVenues.map((venue: any, idx: number) => (
              <div key={venue.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{venue.name}</p>
                    <p className="text-xs text-muted-foreground">{venue.totalReviews} reviews</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold">{venue.rating}</span>
                </div>
              </div>
            ))}
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
            {stats.recentBookings.map((booking: any) => (
              <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">
                    {booking.members?.[0]?.user?.name || 'User'} → {booking.court?.venue?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.court?.name} • {booking.date} • {booking.startTime}-{booking.endTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">Rs {booking.totalPrice}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{booking.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-center">
              <p className="text-3xl font-bold text-emerald-700">Rs {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-emerald-600 mt-1">Gross Merchandise Value</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total booking value across platform</p>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 text-center">
              <p className="text-3xl font-bold text-amber-700">Rs {stats.platformEarnings.toLocaleString()}</p>
              <p className="text-sm text-amber-600 mt-1">Platform Earnings (8%)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Commission from bookings</p>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-center">
              <p className="text-3xl font-bold text-blue-700">
                {stats.totalBookings > 0 ? `Rs ${Math.round(stats.totalRevenue / stats.totalBookings).toLocaleString()}` : 'Rs 0'}
              </p>
              <p className="text-sm text-blue-600 mt-1">Avg. Booking Value</p>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue per booking</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
