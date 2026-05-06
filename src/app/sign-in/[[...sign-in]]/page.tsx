'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Only load Clerk SignIn component on the client side
const ClerkSignIn = dynamic(
  () => import('@clerk/nextjs').then(mod => function ClerkSignInInner() {
    return <mod.SignIn />
  }),
  { ssr: false }
)

export default function SignInPage() {
  // Redirect to custom login page when Clerk is not configured
  useEffect(() => {
    if (!CLERK_KEY) {
      // Navigate to home page which will show the SPA login
      window.location.href = '/'
    }
  }, [])

  if (!CLERK_KEY) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <ClerkSignIn />
    </div>
  )
}
