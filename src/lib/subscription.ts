/**
 * Subscription tier configuration and helpers.
 * Manual payment model for Nepal market — no automated gateway.
 */

export type Tier = 'free' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled'

export const TIER_LIMITS: Record<Tier, {
  maxVenues: number
  maxBookingsPerMonth: number
  dynamicPricing: boolean
  fullAnalytics: boolean
  customBranding: boolean
  prioritySupport: boolean
}> = {
  free: {
    maxVenues: 3,
    maxBookingsPerMonth: 10,
    dynamicPricing: false,
    fullAnalytics: false,
    customBranding: false,
    prioritySupport: false,
  },
  pro: {
    maxVenues: 10,
    maxBookingsPerMonth: Infinity,
    dynamicPricing: true,
    fullAnalytics: true,
    customBranding: false,
    prioritySupport: false,
  },
  enterprise: {
    maxVenues: Infinity,
    maxBookingsPerMonth: Infinity,
    dynamicPricing: true,
    fullAnalytics: true,
    customBranding: true,
    prioritySupport: true,
  },
}

export const TIER_PRICING: Record<Tier, {
  monthlyNPR: number
  label: string
}> = {
  free: { monthlyNPR: 0, label: 'Free' },
  pro: { monthlyNPR: 2000, label: 'Pro' },
  enterprise: { monthlyNPR: 5000, label: 'Enterprise' },
}

export const TRIAL_DURATION_DAYS = 30

/**
 * Get the effective tier for a user.
 * If trial has expired, returns 'free' tier limits even if status still says 'trial'.
 */
export function getEffectiveTier(
  tier: Tier | null | undefined,
  status: SubscriptionStatus | null | undefined,
  trialEndsAt: Date | null | undefined
): Tier {
  const resolvedTier = tier || 'free'

  // If on trial and trial hasn't expired, treat as pro
  if (status === 'trial' && trialEndsAt) {
    if (new Date(trialEndsAt) > new Date()) {
      return 'pro' // Trial gives pro features
    }
    // Trial expired — will be caught lazily on next subscription read
  }

  if (status === 'expired' || status === 'cancelled') {
    return 'free'
  }

  return resolvedTier
}

/**
 * Check if a trial has expired and return the status that should be used.
 */
export function checkTrialExpiry(
  status: SubscriptionStatus | undefined,
  trialEndsAt: Date | null | undefined
): SubscriptionStatus | null {
  if (status === 'trial' && trialEndsAt && new Date(trialEndsAt) <= new Date()) {
    return 'expired'
  }
  return null
}
