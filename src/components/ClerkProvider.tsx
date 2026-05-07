'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

// Clerk is optional — if NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set,
// the app uses custom auth only and ClerkProvider is skipped entirely.
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function AppClerkProvider({ children }: { children: React.ReactNode }) {
  const [clerkError, setClerkError] = useState(false)

  useEffect(() => {
    if (!CLERK_KEY) return
    // Test if Clerk can initialize by checking for a valid key format
    try {
      if (!CLERK_KEY.startsWith('pk_test_') && !CLERK_KEY.startsWith('pk_live_')) {
        console.warn('[Clerk] Invalid publishable key format, falling back to custom auth only')
        setClerkError(true)
      }
    } catch {
      setClerkError(true)
    }
  }, [])

  if (!CLERK_KEY || clerkError) {
    // No Clerk configured or Clerk failed — pass through children without Clerk wrapper
    return <>{children}</>
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#16a34a',
          colorBackground: '#ffffff',
          colorInputBackground: '#f5f5f5',
          colorInputText: '#1a1a1a',
        },
        elements: {
          formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
          card: 'bg-card shadow-sm border',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
