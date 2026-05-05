'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Search, MapPin, Star, Clock, Filter, X, SlidersHorizontal
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface Venue {
  id: string
  name: string
  city: string
  address: string
  sports: string
  amenities: string
  rating: number
  totalReviews: number
  isFeatured: boolean
  courts: { id: string; name: string; sport: string; pricePerHour: number; isIndoor: boolean }[]
  description?: string
  _count?: { reviews: number; bookings: number; tournaments: number }
}

export default function VenuesPage() {
  const { navigate, setSelectedVenueId, searchQuery, setSearchQuery, selectedSport, setSelectedSport, selectedCity, setSelectedCity } = useAppStore()
  const { toast } = useToast()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (selectedSport) params.set('sport', selectedSport)
      if (selectedCity) params.set('city', selectedCity)

      const res = await fetch(`/api/venues/search?${params.toString()}`)
      const data = await res.json()
      setVenues(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'Error loading venues', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedSport, selectedCity])

  useEffect(() => { fetchVenues() }, [fetchVenues])

  const openVenue = (id: string) => {
    setSelectedVenueId(id)
    navigate('venue-detail')
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSport('')
    setSelectedCity('')
  }

  const hasFilters = searchQuery || selectedSport || selectedCity

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Find Your Game Venue</h1>
        <p className="text-sm text-muted-foreground">
          {venues.length} venue{venues.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, location..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="futsal">⚽ Futsal</SelectItem>
              <SelectItem value="basketball">🏀 Basketball</SelectItem>
              <SelectItem value="badminton">🏸 Badminton</SelectItem>
              <SelectItem value="football">🏈 Football</SelectItem>
              <SelectItem value="cricket">🏏 Cricket</SelectItem>
              <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Kathmandu">Kathmandu</SelectItem>
              <SelectItem value="Lalitpur">Lalitpur</SelectItem>
              <SelectItem value="Bhaktapur">Bhaktapur</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="icon" className="h-10" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchQuery && <Badge variant="secondary" className="gap-1">Search: {searchQuery} <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button></Badge>}
          {selectedSport && <Badge variant="secondary" className="gap-1 capitalize">Sport: {selectedSport.replace('_', ' ')} <button onClick={() => setSelectedSport('')}><X className="w-3 h-3" /></button></Badge>}
          {selectedCity && <Badge variant="secondary" className="gap-1">City: {selectedCity} <button onClick={() => setSelectedCity('')}><X className="w-3 h-3" /></button></Badge>}
        </div>
      )}

      {/* Venue Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
      ) : venues.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏟️</div>
          <h3 className="text-lg font-semibold mb-1">No venues found</h3>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
          <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => {
            const venueSports = JSON.parse(venue.sports || '[]')
            const venueAmenities = JSON.parse(venue.amenities || '[]')
            const minPrice = venue.courts.length > 0 ? Math.min(...venue.courts.map(c => c.pricePerHour)) : 0
            const maxPrice = venue.courts.length > 0 ? Math.max(...venue.courts.map(c => c.pricePerHour)) : 0

            return (
              <Card
                key={venue.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border hover:border-primary/20"
                onClick={() => openVenue(venue.id)}
              >
                {(() => {
                  const imgs = JSON.parse(venue.images || '[]')
                  return (
                    <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-primary/15 to-primary/5">
                      {imgs.length > 0 ? (
                        <img src={imgs[0]} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><span className="text-6xl">🏟️</span></div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-1 flex-wrap justify-end">
                    {venueSports.slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px] capitalize bg-background/80 backdrop-blur-sm">
                        {s.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                  {venue.isFeatured && (
                    <Badge className="absolute top-3 left-3 bg-amber-500 text-white text-[10px]">
                      <Star className="w-3 h-3 mr-1 fill-amber-500" /> Featured
                    </Badge>
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-1">
                    {venueAmenities.slice(0, 3).map((a: string) => (
                      <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm capitalize">
                        {a.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                    )
                  })()}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {venue.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs shrink-0 ml-2">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{venue.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{venue.address}, {venue.city}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{venue.courts.length} courts available</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <span className="text-lg font-bold text-primary">Rs {minPrice}</span>
                      {maxPrice > minPrice && <span className="text-xs text-muted-foreground"> - Rs {maxPrice}</span>}
                      <span className="text-xs text-muted-foreground">/hr</span>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Book Now
                    </Button>
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
