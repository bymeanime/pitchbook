'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  User, Mail, Phone, Shield, Calendar, Star, Trophy,
  BookOpen, ChevronRight, MapPin
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface BookingHistory {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  court: { name: string; sport: string; venue: { name: string; city: string } }
}

interface TournamentTeam {
  id: string
  name: string
  tournament: { id: string; name: string; sport: string; status: string; startDate: string }
}

export default function ProfilePage() {
  const { user, token, navigate } = useAppStore()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<BookingHistory[]>([])
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [stats, setStats] = useState({ totalBookings: 0, totalSpent: 0, tournamentsJoined: 0, reviewsGiven: 0 })
  const [fetched, setFetched] = useState(false)
  const isAuth = !!user && !!token
  const loading = isAuth && !fetched

  useEffect(() => {
    if (!isAuth) return

    Promise.all([
      fetch('/api/bookings', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json()).catch(() => []),
      fetch('/api/tournaments').then(r => r.json()).catch(() => []),
    ]).then(([bookingsData, tournamentsData]) => {
      const userBookings = Array.isArray(bookingsData) ? bookingsData : []
      setBookings(userBookings)

      // Find teams this user is captain of
      const userTeams: TournamentTeam[] = []
      if (Array.isArray(tournamentsData)) {
        for (const t of tournamentsData) {
          const res = fetch(`/api/tournaments/${t.id}`)
            .then(r => r.json())
            .then(data => {
              if (data.teams) {
                const myTeams = data.teams.filter((team: any) => team.captainId === user?.id)
                for (const team of myTeams) {
                  userTeams.push({ id: team.id, name: team.name, tournament: { id: t.id, name: t.name, sport: t.sport, status: t.status, startDate: t.startDate } })
                }
              }
            })
        }
      }

      setTeams(userTeams)

      setStats({
        totalBookings: userBookings.length,
        totalSpent: userBookings.reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0),
        tournamentsJoined: userTeams.length,
        reviewsGiven: 0
      })
    }).finally(() => setFetched(true))
  }, [user, token])

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">Login to view your profile</h2>
        <p className="text-sm text-muted-foreground mb-4">You need to be logged in</p>
        <Button onClick={() => navigate('login')}>Login</Button>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    confirmed: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-blue-100 text-blue-800',
    pending: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Profile Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-2xl">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>}
            </div>
            <Badge variant="secondary" className="mt-1 capitalize">
              <Shield className="w-3 h-3 mr-1" />
              {user.role.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Bookings', value: stats.totalBookings.toString(), icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Spent', value: `Rs ${stats.totalSpent.toLocaleString()}`, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Tournaments', value: stats.tournamentsJoined.toString(), icon: Trophy, color: 'text-amber-600 bg-amber-50' },
          { label: 'Member Since', value: '2025', icon: User, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color.split(' ')[0]}`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bookings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('my-bookings')}>
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{b.court?.name || 'Court'}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.court?.venue?.name} • {b.date} • {b.startTime}-{b.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">Rs {b.totalPrice}</p>
                    <Badge className={`text-[10px] ${statusColor[b.status] || ''}`} style={{ colorScheme: undefined }}>
                      <span className="capitalize">{b.status}</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Tournament Teams */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Tournament Teams</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('tournaments')}>
              Browse <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              You haven&apos;t joined any tournaments yet
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teams.slice(0, 5).map((team) => (
                <button
                  key={team.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-left"
                  onClick={() => {
                    useAppStore.getState().setSelectedTournamentId(team.tournament.id)
                    navigate('tournament-detail')
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.tournament.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {team.tournament.sport}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
