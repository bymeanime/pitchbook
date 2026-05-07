'use client'

import React, { useState } from 'react'
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
import { Plus, Trash2, Loader2 } from 'lucide-react'

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

const SURFACE_OPTIONS = [
  { value: 'artificial_turf', label: 'Artificial Turf' },
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'clay', label: 'Clay' },
  { value: 'concrete', label: 'Concrete' },
] as const

interface CourtEntry {
  name: string
  sport: string
  surface: string
  isIndoor: boolean
  pricePerHour: string
}

interface AddVenueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function AddVenueDialog({ open, onOpenChange, onSuccess }: AddVenueDialogProps) {
  const { token } = useAppStore()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [courts, setCourts] = useState<CourtEntry[]>([])

  const resetForm = () => {
    setName('')
    setDescription('')
    setAddress('')
    setCity('')
    setPhone('')
    setWebsite('')
    setSelectedSports([])
    setSelectedAmenities([])
    setCourts([])
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
    // Remove courts whose sport was unselected
    setCourts((prev) => prev.filter((c) => sport === '' || selectedSports.includes(c.sport) || c.sport !== sport))
  }

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  const addCourt = () => {
    setCourts((prev) => [
      ...prev,
      {
        name: '',
        sport: selectedSports[0] || 'futsal',
        surface: 'artificial_turf',
        isIndoor: false,
        pricePerHour: '',
      },
    ])
  }

  const removeCourt = (index: number) => {
    setCourts((prev) => prev.filter((_, i) => i !== index))
  }

  const updateCourt = (index: number, field: keyof CourtEntry, value: string | boolean) => {
    setCourts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Venue name is required'
    if (!address.trim()) return 'Address is required'
    if (!city) return 'City is required'
    if (selectedSports.length === 0) return 'Select at least one sport'
    if (courts.length === 0) return 'Add at least one court'
    for (let i = 0; i < courts.length; i++) {
      const c = courts[i]
      if (!c.name.trim()) return `Court ${i + 1}: name is required`
      if (!c.sport) return `Court ${i + 1}: select a sport`
      if (!c.pricePerHour || Number(c.pricePerHour) <= 0) return `Court ${i + 1}: price must be greater than 0`
    }
    return null
  }

  const handleSubmit = async () => {
    const error = validate()
    if (error) {
      toast({ title: error, variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        city,
        phone: phone.trim() || null,
        website: website.trim() || null,
        sports: selectedSports,
        amenities: selectedAmenities,
        images: [],
        courts: courts.map((c) => ({
          name: c.name.trim(),
          sport: c.sport,
          surface: c.surface,
          isIndoor: c.isIndoor,
          pricePerHour: Number(c.pricePerHour),
        })),
      }

      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to create venue (${res.status})`)
      }

      toast({ title: 'Venue created successfully!' })
      handleClose(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to create venue', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] !flex !flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Add New Venue</DialogTitle>
          <DialogDescription>Fill in the details to list a new venue on PitchBook.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-5 py-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h4>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="venue-name">Name *</Label>
                  <Input
                    id="venue-name"
                    placeholder="e.g. Arena Futsal Hub"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="venue-desc">Description</Label>
                  <Textarea
                    id="venue-desc"
                    placeholder="Describe your venue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-address">Address *</Label>
                    <Input
                      id="venue-address"
                      placeholder="Street address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-city">City *</Label>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-phone">Phone</Label>
                    <Input
                      id="venue-phone"
                      placeholder="+977-9800000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-website">Website</Label>
                    <Input
                      id="venue-website"
                      placeholder="https://example.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
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

            <Separator />

            {/* Courts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Courts</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCourt}
                  disabled={selectedSports.length === 0}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Court
                </Button>
              </div>
              {selectedSports.length === 0 && (
                <p className="text-xs text-muted-foreground">Select at least one sport above to add courts.</p>
              )}
              {courts.length === 0 && selectedSports.length > 0 && (
                <p className="text-xs text-muted-foreground">No courts added yet. Click "Add Court" to get started.</p>
              )}
              <div className="space-y-3">
                {courts.map((court, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-3 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Court {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeCourt(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`court-name-${index}`}>Court Name *</Label>
                        <Input
                          id={`court-name-${index}`}
                          placeholder="e.g. Court A"
                          value={court.name}
                          onChange={(e) => updateCourt(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`court-sport-${index}`}>Sport *</Label>
                        <Select
                          value={court.sport}
                          onValueChange={(val) => updateCourt(index, 'sport', val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select sport" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedSports.map((s) => {
                              const opt = SPORT_OPTIONS.find((o) => o.value === s)
                              return (
                                <SelectItem key={s} value={s}>{opt?.label || s}</SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`court-surface-${index}`}>Surface</Label>
                        <Select
                          value={court.surface}
                          onValueChange={(val) => updateCourt(index, 'surface', val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select surface" />
                          </SelectTrigger>
                          <SelectContent>
                            {SURFACE_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`court-price-${index}`}>Price per Hour (NPR) *</Label>
                        <Input
                          id={`court-price-${index}`}
                          type="number"
                          min="0"
                          placeholder="1500"
                          value={court.pricePerHour}
                          onChange={(e) => updateCourt(index, 'pricePerHour', e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={court.isIndoor}
                        onCheckedChange={(checked) =>
                          updateCourt(index, 'isIndoor', checked === true)
                        }
                      />
                      <span className="text-sm">Indoor court</span>
                    </label>
                  </div>
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
            Create Venue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
