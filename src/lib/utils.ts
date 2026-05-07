import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shared utility functions used across multiple components.
 */

/**
 * Safely parse a JSON string that may be null, undefined, or malformed.
 * Returns the fallback value (default: []) if parsing fails.
 */
export function safeJsonParse<T = unknown[]>(str: string | null | undefined, fallback?: T): T {
  if (!str) return (fallback ?? []) as T
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? (parsed as T) : (fallback ?? []) as T
  } catch {
    return (fallback ?? []) as T
  }
}

/**
 * Format a date string to a human-readable "Month Year" format.
 */
export function formatDateMemberSince(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Simple debounce utility for search inputs.
 * Returns a debounced version of the callback.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delayMs)
  }
}
