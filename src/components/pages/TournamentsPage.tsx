'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Trophy, Calendar, MapPin, Users, Award, ChevronRight,
  DollarSign, Clock, Swords, CheckCircle, XCircle, Plus
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface Tournament {
  id: string
  name: string
  description: string | null
  sport: string
  format: string
  maxTeams: number
  entryFee: number
  prizePool: number
  startDate: string
  endDate: string
  status: string
  image?: string | null
  rules?: string | null
  host: { id: string; name: string }
  venue: { id: string; name: string; address: string; city: string }
  _count: { teams: number; matches: number }
}

interface TournamentDetail extends Tournament {
  teams: { id: string; name: string; captainId: string; captain: { id: string; name: string } }[]
  matches: {
    id: string
    round: number
    matchNumber: number
    scheduledDate: string
    scheduledTime: string
    scoreA: number | null
    scoreB: number | null
    status: string
    teamA: { id: string; name: string; captain: { name: string } } | null
    teamB: { id: string; name: string; captain: { name: string } } | null
  }[]
}

const statusColors: Record<string, string> = {
  registration: 'bg-emerald-100 text-emerald-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

const formatLabels: Record<string, string> = {
  knockout: 'Knockout',
  league: 'League',
  round_robin: 'Round Robin',
}

export default function TournamentsPage() {
  const { navigate, setSelectedTournamentId, user, token } = useAppStore()
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('')

  useEffect(() => {
    const params = sportFilter ? `?sport=${sportFilter}` : ''
    fetch(`/api/tournaments${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tournaments')
        return res.json()
      })
      .then(data => {
        setTournaments(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        toast({ title: 'Failed to load tournaments', variant: 'destructive' })
        setLoading(false)
      })
  }, [sportFilter, toast])

  const openTournament = (id: string) => {
    setSelectedTournamentId(id)
    navigate('tournament-detail')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-muted-foreground">Compete, win prizes, and make your mark</p>
        </div>
        <div className="flex gap-2">
          {['', 'futsal', 'basketball', 'badminton'].map(s => (
            <Button
              key={s || 'all'}
              variant={sportFilter === s ? 'default' : 'outline'}
              size="sm"
              className="capitalize text-xs"
              onClick={() => setSportFilter(s)}
            >
              {s || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map((t) => (
            <Card
              key={t.id}
              className="hover:shadow-lg transition-all cursor-pointer group border hover:border-primary/20"
              onClick={() => openTournament(t.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={statusColors[t.status] || ''} style={{ colorScheme: undefined }}>
                    <span className="capitalize">{t.status}</span>
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{formatLabels[t.format] || t.format}</Badge>
                </div>

                <h3 className="font-semibold text-base group-hover:text-primary transition-colors mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.venue.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <div>
                      <p className="font-medium">{t.startDate}</p>
                      <p className="text-muted-foreground">to {t.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <div>
                      <p className="font-medium">{t._count.teams}/{t.maxTeams} teams</p>
                      <p className="text-muted-foreground">{t.maxTeams - t._count.teams} spots left</p>
                    </div>
                  </div>
                </div>

                <Separator className="mb-3" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Rs {t.entryFee.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">entry</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-amber-600">Rs {t.prizePool.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="gap-1">
                    View <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {tournaments.length === 0 && !loading && (
            <div className="col-span-full text-center py-16">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No Tournaments Found</h3>
              <p className="text-sm text-muted-foreground">
                {sportFilter ? 'No tournaments for this sport' : 'No tournaments available yet'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TournamentDetailPage() {
  const { selectedTournamentId, navigate, user, token } = useAppStore()
  const { toast } = useToast()
  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [activeSection, setActiveSection] = useState<'overview' | 'teams' | 'matches'>('overview')

  useEffect(() => {
    if (!selectedTournamentId) return
    setLoading(true)
    fetch(`/api/tournaments/${selectedTournamentId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tournament')
        return res.json()
      })
      .then(data => setTournament(data))
      .catch(() => toast({ title: 'Failed to load', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [selectedTournamentId, toast])

  const handleRegister = async () => {
    if (!user || !token) {
      toast({ title: 'Please login first', variant: 'destructive' })
      navigate('login')
      return
    }
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ teamName })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Registration failed')
      toast({ title: 'Team registered successfully!' })
      setRegisterOpen(false)
      setTeamName('')
      // Reload
      const reloadRes = await fetch(`/api/tournaments/${selectedTournamentId}`)
      if (reloadRes.ok) {
        const data = await reloadRes.json()
        setTournament(data)
      }
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  if (!selectedTournamentId) {
    setLoading(false)
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" className="mb-4 gap-1" onClick={() => navigate('tournaments')}>
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Tournaments
        </Button>
        <div className="text-center py-16">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">No Tournament Selected</h2>
          <p className="text-sm text-muted-foreground mb-4">Please select a tournament to view details</p>
          <Button onClick={() => navigate('tournaments')}>Browse Tournaments</Button>
        </div>
      </div>
    )
  }

  if (loading || !tournament) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    )
  }

  const spotsLeft = tournament.maxTeams - tournament._count.teams

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" className="mb-4 gap-1" onClick={() => navigate('tournaments')}>
        <ChevronRight className="w-4 h-4 rotate-180" /> Back
      </Button>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 sm:p-8 mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={statusColors[tournament.status] || ''}><span className="capitalize">{tournament.status}</span></Badge>
          <Badge variant="outline" className="capitalize">{tournament.sport}</Badge>
          <Badge variant="outline">{formatLabels[tournament.format]}</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{tournament.name}</h1>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">{tournament.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-white/80 dark:bg-black/20">
            <Calendar className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Dates</p>
            <p className="text-sm font-semibold">{tournament.startDate} to {tournament.endDate}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/80 dark:bg-black/20">
            <Users className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Teams</p>
            <p className="text-sm font-semibold">{tournament._count.teams}/{tournament.maxTeams}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/80 dark:bg-black/20">
            <DollarSign className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Entry Fee</p>
            <p className="text-sm font-semibold">Rs {tournament.entryFee.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/80 dark:bg-black/20">
            <Award className="w-4 h-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground">Prize Pool</p>
            <p className="text-sm font-bold text-amber-600">Rs {tournament.prizePool.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {tournament.venue.name}, {tournament.venue.city}</span>
          <span>Hosted by {tournament.host.name}</span>
        </div>

        {tournament.status === 'registration' && spotsLeft > 0 && (
          <div className="mt-4">
            <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-4 h-4" /> Register Your Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register Your Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Entry fee: <strong>Rs {tournament.entryFee.toLocaleString()}</strong> • {spotsLeft} spots remaining
                  </p>
                  <div>
                    <Label>Team Name</Label>
                    <Input placeholder="Enter your team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                  </div>
                  <Button className="w-full" disabled={!teamName.trim()} onClick={handleRegister}>
                    Complete Registration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(['overview', 'teams', 'matches'] as const).map(section => (
          <button
            key={section}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeSection === section ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveSection(section)}
          >
            {section} {section === 'teams' ? `(${tournament._count.teams})` : section === 'matches' ? `(${tournament.matches.length})` : ''}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {tournament.rules && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Rules & Regulations</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{tournament.rules}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Teams */}
      {activeSection === 'teams' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tournament.teams.map((team, idx) => (
            <Card key={team.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-muted-foreground">Captain: {team.captain.name}</p>
                  </div>
                </div>
                {team.captainId === user?.id && (
                  <Badge variant="secondary" className="text-[10px]">Your Team</Badge>
                )}
              </CardContent>
            </Card>
          ))}
          {tournament.teams.length === 0 && (
            <p className="text-center text-muted-foreground py-8 col-span-2">No teams registered yet</p>
          )}
        </div>
      )}

      {/* Matches / Bracket */}
      {activeSection === 'matches' && (
        <div className="space-y-3">
          {tournament.matches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Matches will be scheduled once registration is complete</p>
          ) : (
            tournament.matches.map((match) => (
              <Card key={match.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Round {match.round}</Badge>
                      <Badge variant="outline" className="text-[10px]">Match #{match.matchNumber}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{match.scheduledDate} {match.scheduledTime}</span>
                      <Badge className={`text-[10px] ${match.status === 'completed' ? 'bg-green-100 text-green-800' : match.status === 'live' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        <span className="capitalize">{match.status}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {match.teamA ? match.teamA.name.charAt(0) : '?'}
                      </div>
                      <span className="text-sm font-medium">{match.teamA?.name || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 mx-4">
                      {match.scoreA !== null ? (
                        <span className="text-xl font-bold">{match.scoreA} - {match.scoreB}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">vs</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-sm font-medium">{match.teamB?.name || 'TBD'}</span>
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {match.teamB ? match.teamB.name.charAt(0) : '?'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
