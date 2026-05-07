'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Plus, Trash2, Loader2, Pencil, Tag, Clock, Calendar, Percent,
  AlertTriangle, TrendingUp, TrendingDown, DollarSign
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface VenueSummary {
  id: string
  name: string
  city: string
}

interface CourtSummary {
  id: string
  name: string
  sport: string
}

interface PricingRule {
  id: string
  venueId: string
  courtId: string | null
  name: string | null
  date: string | null
  dayOfWeek: number | null
  startTime: string | null
  endTime: string | null
  validFrom: string | null
  validUntil: string | null
  flatPrice: number | null
  priceMultiplier: number
  priority: number
  isActive: boolean
  court: CourtSummary | null
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

interface PricingRulesPanelProps {
  venues: VenueSummary[]
  token: string
}

export default function PricingRulesPanel({ venues, token }: PricingRulesPanelProps) {
  const { toast } = useToast()

  // State
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [selectedVenueId, setSelectedVenueId] = useState<string>('')
  const [courts, setCourts] = useState<CourtSummary[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formCourtId, setFormCourtId] = useState<string>('all')
  const [formName, setFormName] = useState('')
  const [formTriggerType, setFormTriggerType] = useState<'day_of_week' | 'time_window' | 'specific_date'>('day_of_week')
  const [formDayOfWeek, setFormDayOfWeek] = useState<string>('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formSpecificDate, setFormSpecificDate] = useState('')
  const [formPriceType, setFormPriceType] = useState<'multiplier' | 'flat'>('multiplier')
  const [formMultiplier, setFormMultiplier] = useState('1.0')
  const [formFlatPrice, setFormFlatPrice] = useState('')
  const [formPriority, setFormPriority] = useState('0')

  // Load rules for selected venue
  const loadRules = useCallback(async () => {
    if (!selectedVenueId) {
      setRules([])
      return
    }
    setLoadingRules(true)
    try {
      const res = await fetch(`/api/pricing-rules?venueId=${selectedVenueId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load rules')
      const data = await res.json()
      setRules(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'Failed to load pricing rules', variant: 'destructive' })
      setRules([])
    } finally {
      setLoadingRules(false)
    }
  }, [selectedVenueId, token])

  // Load courts for selected venue
  useEffect(() => {
    if (selectedVenueId && token) {
      fetch(`/api/venues/${selectedVenueId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setCourts(Array.isArray(data.courts) ? data.courts.map((c: any) => ({ id: c.id, name: c.name, sport: c.sport })) : [])
        })
        .catch(() => setCourts([]))
    } else {
      setCourts([])
    }
  }, [selectedVenueId, token])

  // Load rules when venue changes
  useEffect(() => {
    loadRules()
  }, [loadRules])

  // Set default venue
  useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id)
    }
  }, [venues])

  const resetForm = () => {
    setFormCourtId('all')
    setFormName('')
    setFormTriggerType('day_of_week')
    setFormDayOfWeek('')
    setFormStartTime('')
    setFormEndTime('')
    setFormSpecificDate('')
    setFormPriceType('multiplier')
    setFormMultiplier('1.0')
    setFormFlatPrice('')
    setFormPriority('0')
    setEditingRule(null)
    setShowForm(false)
  }

  const openEditForm = (rule: PricingRule) => {
    setEditingRule(rule)
    setShowForm(true)
    setFormCourtId(rule.courtId || 'all')
    setFormName(rule.name || '')
    if (rule.date) {
      setFormTriggerType('specific_date')
      setFormSpecificDate(rule.date)
    } else if (rule.startTime || rule.endTime) {
      setFormTriggerType('time_window')
      setFormStartTime(rule.startTime || '')
      setFormEndTime(rule.endTime || '')
      if (rule.dayOfWeek !== null) setFormDayOfWeek(String(rule.dayOfWeek))
    } else if (rule.dayOfWeek !== null) {
      setFormTriggerType('day_of_week')
      setFormDayOfWeek(String(rule.dayOfWeek))
    }
    if (rule.flatPrice !== null && rule.flatPrice !== undefined) {
      setFormPriceType('flat')
      setFormFlatPrice(String(rule.flatPrice))
    } else {
      setFormPriceType('multiplier')
      setFormMultiplier(String(rule.priceMultiplier))
    }
    setFormPriority(String(rule.priority))
  }

  const handleCreate = async () => {
    if (!selectedVenueId) return

    // Validation
    if (formTriggerType === 'day_of_week' && !formDayOfWeek) {
      toast({ title: 'Select a day of week', variant: 'destructive' })
      return
    }
    if (formTriggerType === 'time_window' && (!formStartTime || !formEndTime)) {
      toast({ title: 'Set start and end time', variant: 'destructive' })
      return
    }
    if (formTriggerType === 'specific_date' && !formSpecificDate) {
      toast({ title: 'Select a date', variant: 'destructive' })
      return
    }
    if (formPriceType === 'multiplier') {
      const mult = parseFloat(formMultiplier)
      if (isNaN(mult) || mult <= 0) {
        toast({ title: 'Multiplier must be greater than 0', variant: 'destructive' })
        return
      }
    }
    if (formPriceType === 'flat') {
      const price = parseFloat(formFlatPrice)
      if (isNaN(price) || price <= 0) {
        toast({ title: 'Flat price must be greater than 0', variant: 'destructive' })
        return
      }
    }

    setSubmitting(true)
    try {
      const payload: any = {
        venueId: selectedVenueId,
        courtId: formCourtId === 'all' ? null : formCourtId,
        name: formName || null,
        priority: parseInt(formPriority) || 0,
      }

      if (formTriggerType === 'day_of_week') {
        payload.dayOfWeek = parseInt(formDayOfWeek)
      } else if (formTriggerType === 'time_window') {
        payload.startTime = formStartTime
        payload.endTime = formEndTime
        if (formDayOfWeek) payload.dayOfWeek = parseInt(formDayOfWeek)
      } else if (formTriggerType === 'specific_date') {
        payload.date = formSpecificDate
      }

      if (formPriceType === 'multiplier') {
        payload.priceMultiplier = parseFloat(formMultiplier)
      } else {
        payload.flatPrice = parseFloat(formFlatPrice)
      }

      if (editingRule) {
        // Update existing rule
        const res = await fetch('/api/pricing-rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: editingRule.id, ...payload })
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update rule')
        }
        toast({ title: 'Pricing rule updated' })
      } else {
        // Create new rule
        const res = await fetch('/api/pricing-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create rule')
        }
        toast({ title: 'Pricing rule created' })
      }

      resetForm()
      loadRules()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save pricing rule', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/pricing-rules?id=${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete rule')
      toast({ title: 'Pricing rule deactivated' })
      loadRules()
    } catch {
      toast({ title: 'Failed to delete rule', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (rule: PricingRule) => {
    try {
      const res = await fetch('/api/pricing-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive })
      })
      if (!res.ok) throw new Error('Failed to toggle rule')
      loadRules()
    } catch {
      toast({ title: 'Failed to update rule', variant: 'destructive' })
    }
  }

  const getTriggerLabel = (rule: PricingRule): string => {
    const parts: string[] = []
    if (rule.date) parts.push(rule.date)
    if (rule.dayOfWeek !== null) parts.push(DAYS_OF_WEEK[rule.dayOfWeek])
    if (rule.startTime && rule.endTime) parts.push(`${rule.startTime}-${rule.endTime}`)
    else if (rule.startTime) parts.push(`from ${rule.startTime}`)
    else if (rule.endTime) parts.push(`until ${rule.endTime}`)
    return parts.join(' / ') || 'Always'
  }

  const getPriceLabel = (rule: PricingRule): string => {
    if (rule.flatPrice !== null && rule.flatPrice !== undefined) {
      return `Rs ${rule.flatPrice}/hr`
    }
    const mult = rule.priceMultiplier
    if (mult >= 1) return `${mult}x (Surge)`
    return `${mult}x (${Math.round((1 - mult) * 100)}% off)`
  }

  const isDiscount = (rule: PricingRule): boolean => {
    return rule.priceMultiplier < 1
  }

  return (
    <div className="space-y-4">
      {/* Venue selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium shrink-0">Venue:</Label>
        <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select venue" />
          </SelectTrigger>
          <SelectContent>
            {venues.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name} ({v.city})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedVenueId ? (
        <p className="text-sm text-muted-foreground text-center py-8">Select a venue to manage pricing rules</p>
      ) : (
        <>
          {/* Existing Rules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Pricing Rules ({rules.length})</CardTitle>
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} disabled={showForm}>
                <Plus className="w-4 h-4 mr-1" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {loadingRules ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : rules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No pricing rules yet. Create one to set dynamic pricing for this venue.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{rule.name || 'Unnamed Rule'}</span>
                          {isDiscount(rule) ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                              <TrendingDown className="w-3 h-3 mr-0.5" /> Discount
                            </Badge>
                          ) : rule.priceMultiplier > 1 ? (
                            <Badge className="bg-red-100 text-red-700 text-[10px]">
                              <TrendingUp className="w-3 h-3 mr-0.5" /> Surge
                            </Badge>
                          ) : rule.flatPrice ? (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                              <DollarSign className="w-3 h-3 mr-0.5" /> Flat
                            </Badge>
                          ) : null}
                          {!rule.isActive && (
                            <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {getPriceLabel(rule)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {getTriggerLabel(rule)}
                          </span>
                          {rule.court && (
                            <span>Court: {rule.court.name}</span>
                          )}
                          <span>Pri: {rule.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleActive(rule)}
                          className="scale-75"
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditForm(rule)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Form */}
          {showForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {editingRule ? 'Edit Pricing Rule' : 'New Pricing Rule'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rule Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g. Saturday Premium, Morning Discount"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>

                {/* Court Selection */}
                <div className="space-y-1.5">
                  <Label>Court</Label>
                  <Select value={formCourtId} onValueChange={setFormCourtId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courts</SelectItem>
                      {courts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.sport})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trigger Type */}
                <div className="space-y-1.5">
                  <Label>Trigger Type</Label>
                  <Select value={formTriggerType} onValueChange={v => setFormTriggerType(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day_of_week">Day of Week</SelectItem>
                      <SelectItem value="time_window">Time Window</SelectItem>
                      <SelectItem value="specific_date">Specific Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Trigger Details */}
                {formTriggerType === 'day_of_week' && (
                  <div className="space-y-1.5">
                    <Label>Day</Label>
                    <Select value={formDayOfWeek} onValueChange={setFormDayOfWeek}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formTriggerType === 'time_window' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {formTriggerType === 'specific_date' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="specific-date">Date</Label>
                    <Input
                      id="specific-date"
                      type="date"
                      value={formSpecificDate}
                      onChange={e => setFormSpecificDate(e.target.value)}
                    />
                  </div>
                )}

                {/* Price Effect */}
                <div className="space-y-1.5">
                  <Label>Price Effect</Label>
                  <Select value={formPriceType} onValueChange={v => setFormPriceType(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiplier">
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3" /> Multiplier (e.g. 1.5x surge, 0.8x discount)
                        </span>
                      </SelectItem>
                      <SelectItem value="flat">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Flat Price (NPR/hr)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formPriceType === 'multiplier' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="multiplier">
                      Multiplier Value
                      {parseFloat(formMultiplier) < 1 && (
                        <span className="ml-2 text-emerald-600 text-xs">({Math.round((1 - parseFloat(formMultiplier)) * 100)}% discount)</span>
                      )}
                    </Label>
                    <Input
                      id="multiplier"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      placeholder="1.0"
                      value={formMultiplier}
                      onChange={e => setFormMultiplier(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      &gt; 1.0 = surge pricing, &lt; 1.0 = discount pricing, 1.0 = no change
                    </p>
                  </div>
                )}

                {formPriceType === 'flat' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="flat-price">Price per Hour (NPR)</Label>
                    <Input
                      id="flat-price"
                      type="number"
                      min="0"
                      placeholder="2000"
                      value={formFlatPrice}
                      onChange={e => setFormFlatPrice(e.target.value)}
                    />
                  </div>
                )}

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Higher = evaluated first. Default is 0.</p>
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={resetForm} disabled={submitting}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help text */}
          {!showForm && rules.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Dynamic Pricing Tips</p>
              <ul className="text-xs text-muted-foreground space-y-1 text-left max-w-md mx-auto">
                <li>&bull; Set <strong>multiplier &gt; 1.0</strong> for surge pricing (e.g. 1.5x on Saturdays)</li>
                <li>&bull; Set <strong>multiplier &lt; 1.0</strong> for discounts (e.g. 0.8x for morning slots)</li>
                <li>&bull; Use <strong>flat price</strong> for fixed rates on holidays or events</li>
                <li>&bull; <strong>Priority</strong> determines which rule wins when multiple match</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
