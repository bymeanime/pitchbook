'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Search, MapPin, Trophy, Calendar, Shield, Clock,
  Star, Users, Zap, ChevronRight, TrendingUp, Award
} from 'lucide-react'
import { useState, useEffect } from 'react'

const sports = [
  { name: 'Futsal', icon: '⚽', count: 24 },
  { name: 'Basketball', icon: '🏀', count: 8 },
  { name: 'Badminton', icon: '🏸', count: 12 },
  { name: 'Football', icon: '🏈', count: 6 },
  { name: 'Cricket', icon: '🏏', count: 4 },
  { name: 'Volleyball', icon: '🏐', count: 3 },
  { name: 'Table Tennis', icon: '🏓', count: 2 },
]

const stats = [
  { label: 'Venues', value: '500+', icon: MapPin },
  { label: 'Bookings/mo', value: '10K+', icon: Calendar },
  { label: 'Happy Players', value: '50K+', icon: Users },
  { label: 'Tournaments', value: '200+', icon: Trophy },
]

interface Venue {
  id: string
  name: string
  city: string
  sports: string
  rating: number
  totalReviews: number
  isFeatured: boolean
  courts: { sport: string; pricePerHour: number }[]
  description?: string
  address?: string
  images?: string
}

export default function HomePage() {
  const { navigate, setSelectedVenueId, setSelectedTournamentId, setSelectedSport, setSearchQuery } = useAppStore()
  const { toast } = useToast()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loadingVenues, setLoadingVenues] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [tournaments, setTournaments] = useState<any[]>([])

  const safeJsonParse = <T = unknown[]>(str: string | null | undefined, fallback: T = [] as unknown as T): T => {
    if (!str) return fallback
    try {
      const parsed = JSON.parse(str)
      return Array.isArray(parsed) ? (parsed as T) : fallback
    } catch {
      return fallback
    }
  }

  useEffect(() => {
    setLoadingVenues(true)
    fetch('/api/venues')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load venues')
        return res.json()
      })
      .then(data => {
        const venueList = Array.isArray(data) ? data.slice(0, 6) : []
        setVenues(venueList)
        // Compute sport counts from actual venue data
        const sportCounts: Record<string, number> = {}
        venueList.forEach((v: any) => {
          try {
            const venueSports = JSON.parse(v.sports || '[]')
            venueSports.forEach((s: string) => { sportCounts[s] = (sportCounts[s] || 0) + 1 })
          } catch { /* skip malformed sports data */ }
        })
      })
      .catch(() => toast({ title: 'Failed to load featured venues', variant: 'destructive' }))
      .finally(() => setLoadingVenues(false))
  }, [])

  useEffect(() => {
    fetch('/api/tournaments')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tournaments')
        return res.json()
      })
      .then(data => {
        setTournaments(Array.isArray(data) ? data.slice(0, 3) : [])
      })
      .catch(() => {}) // silently fail for homepage
  }, [])

  const handleSearch = () => {
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim())
      navigate('venues')
    }
  }

  const openVenue = (id: string) => {
    setSelectedVenueId(id)
    navigate('venue-detail')
  }

  const sportClick = (sport: string) => {
    setSelectedSport(sport)
    navigate('venues')
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-background">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 gap-1 px-3 py-1">
              <Zap className="w-3 h-3" />
              Book Instantly, Play Immediately
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Find & Book Your
              <span className="text-primary block sm:inline"> Perfect Game Venue</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover futsal courts, turf grounds, basketball courts and more. Book instantly,
              join tournaments, and connect with players in your city.
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search venues, sports, locations..."
                  className="w-full h-12 pl-10 pr-4 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button size="lg" className="h-12 rounded-xl gap-2 px-6" onClick={handleSearch}>
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sports Categories */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Browse by Sport</h2>
              <p className="text-sm text-muted-foreground mt-1">Find venues for your favorite game</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {sports.map(({ name, icon, count }) => (
              <button
                key={name}
                onClick={() => sportClick(name.toLowerCase())}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
                <span className="text-xs font-medium text-center">{name}</span>
                <span className="text-[10px] text-muted-foreground">{count} venues</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Venues */}
      <section className="py-12 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Featured Venues</h2>
              <p className="text-sm text-muted-foreground mt-1">Top-rated sports facilities near you</p>
            </div>
            <Button variant="ghost" className="gap-1 text-sm" onClick={() => navigate('venues')}>
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {loadingVenues ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[16/9] bg-muted animate-pulse" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.filter(v => v.isFeatured).map((venue) => {
              const venueSports = safeJsonParse<string[]>(venue.sports)
              const minPrice = venue.courts.length > 0 ? Math.min(...venue.courts.map(c => c.pricePerHour)) : 0
              return (
                <Card
                  key={venue.id}
                  className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-0 shadow-sm hover:border-primary/20"
                  onClick={() => openVenue(venue.id)}
                >
                  {(() => {
                    const imgs = safeJsonParse<string[]>(venue.images)
                    return (
                      <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                        {imgs.length > 0 ? (
                          <img src={imgs[0]} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><span className="text-6xl">🏟️</span></div>
                        )}
                        <div className="absolute top-3 right-3 flex gap-1">
                          {venueSports.slice(0, 2).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px] capitalize bg-background/80 backdrop-blur-sm">
                              {s}
                            </Badge>
                          ))}
                        </div>
                        {venue.isFeatured && (
                          <Badge className="absolute top-3 left-3 bg-amber-500 text-white text-[10px]">
                            <Star className="w-3 h-3 mr-1 fill-amber-500" /> Featured
                          </Badge>
                        )}
                      </div>
                    )
                  })()}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">{venue.name}</h3>
                      <div className="flex items-center gap-1 text-xs shrink-0 ml-2">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{venue.rating}</span>
                        <span className="text-muted-foreground">({venue.totalReviews})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3" />
                      <span>{venue.city}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">Rs {minPrice}</span>
                        <span className="text-xs text-muted-foreground">/hour</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {venue.courts.length} courts
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-1">Book your game in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Find Your Venue', desc: 'Browse hundreds of venues by sport, location, price, and availability. Filter by amenities like parking, showers, and floodlights.', icon: Search },
              { step: '02', title: 'Book Instantly', desc: 'Select your preferred date and time slot. Pay securely online. Get instant confirmation — no double bookings, guaranteed.', icon: Calendar },
              { step: '03', title: 'Play & Enjoy', desc: 'Show up and play! Leave a review after your game. Earn loyalty points and climb the leaderboard in your city.', icon: Trophy },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative p-6 rounded-2xl border bg-card hover:shadow-md transition-all group">
                <div className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {step}
                </div>
                <Icon className="w-8 h-8 text-primary mb-3 mt-2" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournaments Preview */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Upcoming Tournaments</h2>
              <p className="text-sm opacity-80 mt-1">Compete, win prizes, and make history</p>
            </div>
            <Button variant="secondary" className="gap-1" onClick={() => navigate('tournaments')}>
              All Tournaments <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tournaments.length > 0 ? tournaments.map((t: any) => (
              <Card key={t.id} className="bg-white/10 border-white/20 hover:bg-white/15 transition-all cursor-pointer" onClick={() => { setSelectedTournamentId(t.id); navigate('tournament-detail') }}>
                <CardContent className="p-5">
                  <Badge className="mb-3 capitalize bg-white/20 text-white border-0">{t.sport}</Badge>
                  <h3 className="font-semibold text-base mb-1">{t.name}</h3>
                  <div className="flex items-center gap-4 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.startDate}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t._count?.teams || 0}/{t.maxTeams} teams</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium">
                    <Award className="w-4 h-4" /> Prize: Rs {t.prizePool?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-center text-white/60 py-8 col-span-3">No upcoming tournaments</p>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Own a Sports Venue?</h2>
          <p className="text-muted-foreground mb-6">
            List your venue on PitchBook and reach thousands of players. Get bookings, manage schedules,
            host tournaments, and grow your business — all from one dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" onClick={() => navigate('register')}>
              Get Started Free
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Shield className="w-4 h-4" />
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
