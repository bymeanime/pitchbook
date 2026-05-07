// lib/pricing.ts — Dynamic Pricing Engine for Nepal venues
//
// Price resolution order:
//   1. PricingRule with flatPrice matching court+date+time → use flatPrice
//   2. PricingRule with priceMultiplier → (timeSlot.price || court.pricePerHour) × multiplier
//   3. TimeSlot.price (per-slot override) → use if set
//   4. Court.pricePerHour (base fallback)

import { db } from './db'

interface PricingContext {
  courtId: string
  venueId: string
  date: string       // "2025-01-15"
  startTime: string  // "09:00"
  endTime: string    // "10:00"
}

interface PriceResult {
  basePrice: number          // Court.pricePerHour
  timeSlotPrice: number | null // TimeSlot override (if set)
  effectivePrice: number     // Final price after all rules
  appliedRule: {
    id: string
    name: string | null
    type: 'flat' | 'multiplier'
    value: number
  } | null
  breakdown: string          // Human-readable explanation
}

/**
 * Check if a time string falls within a time window.
 * Works with "HH:MM" format strings.
 */
function timeInRange(time: string, windowStart: string, windowEnd: string): boolean {
  return time >= windowStart && time < windowEnd
}

/**
 * Check if a date string matches a day of week.
 * dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday (ISO/Nepal standard)
 * Uses getUTCDay() at noon Nepal time to avoid Vercel UTC offset issues.
 */
function isDayOfWeek(dateStr: string, dayOfWeek: number): boolean {
  // Parse at noon Nepal time (+05:45) to stay safely away from midnight boundaries
  const utcDate = new Date(dateStr + 'T12:00:00+05:45')
  return utcDate.getUTCDay() === dayOfWeek
}

/**
 * Check if a date is within a valid-from/until range.
 */
function isWithinValidityPeriod(dateStr: string, validFrom?: string | null, validUntil?: string | null): boolean {
  if (validFrom && dateStr < validFrom) return false
  if (validUntil && dateStr > validUntil) return false
  return true
}

/**
 * Calculate the effective price for a court booking.
 * Fetches applicable pricing rules from the database and applies them in priority order.
 */
export async function calculatePrice(ctx: PricingContext): Promise<PriceResult> {
  // Get the court with venue info
  const court = await db.court.findUnique({
    where: { id: ctx.courtId },
    include: { venue: true }
  })

  if (!court) {
    throw new Error('Court not found')
  }

  const basePrice = court.pricePerHour

  // Get the time slot for this day of week and time range
  const dayOfWeek = new Date(ctx.date + 'T12:00:00+05:45').getUTCDay()
  const timeSlot = await db.timeSlot.findFirst({
    where: {
      courtId: ctx.courtId,
      dayOfWeek,
      startTime: { lte: ctx.startTime },
      endTime: { gte: ctx.endTime },
      isActive: true,
    }
  })

  const timeSlotPrice = timeSlot?.price ?? null

  // Fetch all applicable pricing rules for this venue/court
  // Rules can be venue-wide (courtId = null) or court-specific
  const allRules = await db.pricingRule.findMany({
    where: {
      venueId: ctx.venueId,
      isActive: true,
      OR: [
        { courtId: null }, // venue-wide rules
        { courtId: ctx.courtId }, // court-specific rules
      ],
    },
    orderBy: { priority: 'desc' }, // higher priority first
  })

  // Find the first matching rule
  const matchingRule = allRules.find(rule => {
    // Check validity period first
    if (!isWithinValidityPeriod(ctx.date, rule.validFrom, rule.validUntil)) {
      return false
    }

    // Check specific date match
    if (rule.date && rule.date !== ctx.date) {
      return false
    }

    // Check day of week match
    if (rule.dayOfWeek !== null && rule.dayOfWeek !== undefined && !isDayOfWeek(ctx.date, rule.dayOfWeek)) {
      return false
    }

    // Check time-of-day window match
    if (rule.startTime && rule.endTime) {
      if (!timeInRange(ctx.startTime, rule.startTime, rule.endTime)) {
        return false
      }
    } else if (rule.startTime && !rule.endTime) {
      // Only start time set — matches if booking starts at or after this time
      if (ctx.startTime < rule.startTime) {
        return false
      }
    } else if (rule.endTime && !rule.startTime) {
      // Only end time set — matches if booking starts before this time
      if (ctx.startTime >= rule.endTime) {
        return false
      }
    }

    // All conditions matched (or no conditions = always applicable)
    return true
  })

  // Calculate effective price
  let effectivePrice: number
  let appliedRule: PriceResult['appliedRule'] = null
  let breakdown: string

  if (matchingRule) {
    if (matchingRule.flatPrice !== null && matchingRule.flatPrice !== undefined) {
      // Flat price override
      effectivePrice = matchingRule.flatPrice
      appliedRule = {
        id: matchingRule.id,
        name: matchingRule.name,
        type: 'flat',
        value: matchingRule.flatPrice,
      }
      breakdown = `Rs ${effectivePrice} (flat price: ${matchingRule.name || 'custom rule'})`
    } else {
      // Multiplier
      const sourcePrice = timeSlotPrice ?? basePrice
      effectivePrice = Math.round(sourcePrice * matchingRule.priceMultiplier)
      appliedRule = {
        id: matchingRule.id,
        name: matchingRule.name,
        type: 'multiplier',
        value: matchingRule.priceMultiplier,
      }
      breakdown = `Rs ${sourcePrice} × ${matchingRule.priceMultiplier} = Rs ${effectivePrice} (${matchingRule.name || 'custom rule'})`
    }
  } else if (timeSlotPrice !== null) {
    effectivePrice = timeSlotPrice
    breakdown = `Rs ${effectivePrice} (time slot price)`
  } else {
    effectivePrice = basePrice
    breakdown = `Rs ${effectivePrice} (base price)`
  }

  // Calculate platform fee
  const commission = court.venue.commission || 8.0
  const platformFee = Math.round(effectivePrice * (commission / 100))

  return {
    basePrice,
    timeSlotPrice,
    effectivePrice,
    appliedRule,
    breakdown,
  }
}

/**
 * Get price preview for a court+date+time (lightweight, no booking creation).
 * Returns the price info without creating any records.
 */
export async function getPricePreview(ctx: PricingContext) {
  const result = await calculatePrice(ctx)

  // Get the venue commission
  const court = await db.court.findUnique({
    where: { id: ctx.courtId },
    include: { venue: { select: { commission: true } } }
  })

  const commission = court?.venue.commission || 8.0
  const platformFee = Math.round(result.effectivePrice * (commission / 100))

  return {
    ...result,
    platformFee,
    total: result.effectivePrice, // For now, total = effective (no prepayment)
    currency: 'NPR',
  }
}
