'use client'

import { ClerkProvider } from '@clerk/nextjs'

// Clerk is optional — if NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set,
// the app uses custom auth only and ClerkProvider is skipped entirely.
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function AppClerkProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_KEY) {
    // No Clerk configured — pass through children without Clerk wrapper
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
