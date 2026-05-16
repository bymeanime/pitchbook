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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────
const SPORT_OPTIONS = [
  { value: 'futsal', label: 'Futsal' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'volleyball', label: 'Volleyball' },
] as const

const FORMAT_OPTIONS = [
  { value: 'knockout', label: 'Knockout' },
  { value: 'league', label: 'League' },
  { value: 'round_robin', label: 'Round Robin' },
] as const

interface VenueOption {
  id: string
  name: string
  city: string
}

interface CreateTournamentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CreateTournamentDialog({ open, onOpenChange, onSuccess }: CreateTournamentDialogProps) {
  const { token, user } = useAppStore()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [venues, setVenues] = useState<VenueOption[]>([])
  const [venuesLoading, setVenuesLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('')
  const [format, setFormat] = useState('knockout')
  const [maxTeams, setMaxTeams] = useState('8')
  const [entryFee, setEntryFee] = useState('0')
  const [prizePool, setPrizePool] = useState('0')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [venueId, setVenueId] = useState('')
  const [rules, setRules] = useState('')

  // Load owner's venues for the venue dropdown
  useEffect(() => {
    if (open && token) {
      setVenuesLoading(true)
      fetch('/api/venues', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error()
          return res.json()
        })
        .then((data) => {
          const list = Array.isArray(data) ? data : []
          // Only show venues owned by the current user
          setVenues(
            list
              .filter((v: any) => (v.owner?.id || v.ownerId) === user?.id)
              .map((v: any) => ({ id: v.id, name: v.name, city: v.city }))
          )
        })
        .catch(() => {
          setVenues([])
        })
        .finally(() => setVenuesLoading(false))
    }
  }, [open, token, user?.id])

  const resetForm = () => {
    setName('')
    setDescription('')
    setSport('')
    setFormat('knockout')
    setMaxTeams('8')
    setEntryFee('0')
    setPrizePool('0')
    setStartDate('')
    setEndDate('')
    setVenueId('')
    setRules('')
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Tournament name is required'
    if (!sport) return 'Select a sport'
    if (!startDate) return 'Start date is required'
    if (!endDate) return 'End date is required'
    if (startDate > endDate) return 'End date must be after start date'
    if (!venueId) return 'Select a venue'
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
        sport,
        format,
        maxTeams: Number(maxTeams) || 8,
        entryFee: Number(entryFee) || 0,
        prizePool: Number(prizePool) || 0,
        startDate,
        endDate,
        venueId,
        rules: rules.trim() || null,
      }

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to create tournament (${res.status})`)
      }

      toast({ title: 'Tournament created successfully!' })
      handleClose(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to create tournament', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Create Tournament</DialogTitle>
          <DialogDescription>Set up a new tournament at one of your venues.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tournament Details</h4>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tournament-name">Name *</Label>
                  <Input
                    id="tournament-name"
                    placeholder="e.g. Kathmandu Futsal Cup 2025"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tournament-desc">Description</Label>
                  <Textarea
                    id="tournament-desc"
                    placeholder="Describe the tournament..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tournament-sport">Sport *</Label>
                    <Select value={sport} onValueChange={setSport}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORT_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tournament-format">Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Teams & Pricing */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Teams & Pricing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="max-teams">Max Teams</Label>
                  <Input
                    id="max-teams"
                    type="number"
                    min="2"
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entry-fee">Entry Fee (NPR)</Label>
                  <Input
                    id="entry-fee"
                    type="number"
                    min="0"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prize-pool">Prize Pool (NPR)</Label>
                  <Input
                    id="prize-pool"
                    type="number"
                    min="0"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Schedule & Venue */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule & Venue</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tournament-venue">Venue *</Label>
                {venuesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading venues...
                  </div>
                ) : venues.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No venues found. Create a venue first.
                  </p>
                ) : (
                  <Select value={venueId} onValueChange={setVenueId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} — {v.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Separator />

            {/* Rules */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rules</h4>
              <div className="space-y-1.5">
                <Textarea
                  placeholder="Optional: add tournament rules, match duration, substitutions, etc."
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Tournament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
