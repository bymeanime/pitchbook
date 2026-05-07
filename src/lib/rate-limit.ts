/**
 * Simple in-memory rate limiter for serverless environments.
 *
 * In Vercel serverless, function instances may be reused for warm calls,
 * so this provides basic protection against rapid-fire requests within
 * a single instance's lifetime. For production-grade rate limiting,
 * use @upstash/ratelimit with Redis.
 */

const attempts = new Map<string, { count: number; resetAt: number }>()

// Periodically clean up expired entries to prevent memory leaks
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of attempts) {
      if (now > val.resetAt) attempts.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * Check if a request should be rate limited.
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}
