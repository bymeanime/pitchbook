'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────
const CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'] as const

const SPORT_OPTIONS = [
  { value: 'futsal', label: 'Futsal' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'volleyball', label: 'Volleyball' },
] as const

const AMENITY_OPTIONS = [
  { value: 'parking', label: 'Parking' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'showers', label: 'Showers' },
  { value: 'changing_rooms', label: 'Changing Rooms' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'scoreboard', label: 'Scoreboard' },
  { value: 'led_lighting', label: 'LED Lighting' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'floodlights', label: 'Floodlights' },
  { value: 'viewing_gallery', label: 'Viewing Gallery' },
  { value: 'ac', label: 'AC' },
  { value: 'pro_shop', label: 'Pro Shop' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'water', label: 'Water' },
] as const

interface EditVenueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  venueId: string | null
}

export default function EditVenueDialog({ open, onOpenChange, onSuccess, venueId }: EditVenueDialogProps) {
  const { token } = useAppStore()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  // Fetch full venue data when dialog opens
  useEffect(() => {
    if (venueId && open && token) {
      setFetching(true)
      fetch(`/api/venues/${venueId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to load venue')
          return res.json()
        })
        .then(data => {
          setName(data.name || '')
          setDescription(data.description || '')
          setAddress(data.address || '')
          setCity(data.city || '')
          setPhone(data.phone || '')
          try {
            setSelectedSports(typeof data.sports === 'string' ? JSON.parse(data.sports) : Array.isArray(data.sports) ? data.sports : [])
          } catch {
            setSelectedSports([])
          }
          try {
            setSelectedAmenities(typeof data.amenities === 'string' ? JSON.parse(data.amenities) : Array.isArray(data.amenities) ? data.amenities : [])
          } catch {
            setSelectedAmenities([])
          }
        })
        .catch(() => {
          toast({ title: 'Failed to load venue details', variant: 'destructive' })
          onOpenChange(false)
        })
        .finally(() => setFetching(false))
    }
  }, [venueId, open, token])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      onOpenChange(false)
    }
  }

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Venue name is required'
    if (!address.trim()) return 'Address is required'
    if (!city) return 'City is required'
    if (selectedSports.length === 0) return 'Select at least one sport'
    return null
  }

  const handleSubmit = async () => {
    const error = validate()
    if (error) {
      toast({ title: error, variant: 'destructive' })
      return
    }

    if (!venueId) return

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        city,
        phone: phone.trim() || null,
        sports: selectedSports,
        amenities: selectedAmenities,
      }

      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to update venue (${res.status})`)
      }

      toast({ title: 'Venue updated successfully!' })
      handleClose(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update venue', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] !flex !flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Edit Venue</DialogTitle>
          <DialogDescription>Update your venue details on PitchBook.</DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading venue data...</span>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-5 py-4">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h4>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-venue-name">Name *</Label>
                      <Input
                        id="edit-venue-name"
                        placeholder="e.g. Arena Futsal Hub"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-venue-desc">Description</Label>
                      <Textarea
                        id="edit-venue-desc"
                        placeholder="Describe your venue..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-venue-address">Address *</Label>
                        <Input
                          id="edit-venue-address"
                          placeholder="Street address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-venue-city">City *</Label>
                        <Select value={city} onValueChange={setCity}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {CITIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-venue-phone">Phone</Label>
                      <Input
                        id="edit-venue-phone"
                        placeholder="+977-9800000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sports */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sports</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SPORT_OPTIONS.map((sport) => (
                      <label
                        key={sport.value}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <Checkbox
                          checked={selectedSports.includes(sport.value)}
                          onCheckedChange={() => toggleSport(sport.value)}
                        />
                        <span className="text-sm">{sport.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Amenities */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Amenities</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AMENITY_OPTIONS.map((amenity) => (
                      <label
                        key={amenity.value}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <Checkbox
                          checked={selectedAmenities.includes(amenity.value)}
                          onCheckedChange={() => toggleAmenity(amenity.value)}
                        />
                        <span className="text-sm">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
