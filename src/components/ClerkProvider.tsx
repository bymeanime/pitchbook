'use client'

import { ClerkProvider } from '@clerk/nextjs'

export default function AppClerkProvider({ children }: { children: React.ReactNode }) {
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
