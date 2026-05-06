'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Only load Clerk SignUp component on the client side
const ClerkSignUp = dynamic(
  () => import('@clerk/nextjs').then(mod => function ClerkSignUpInner() {
    return <mod.SignUp />
  }),
  { ssr: false }
)

export default function SignUpPage() {
  // Redirect to custom register page when Clerk is not configured
  useEffect(() => {
    if (!CLERK_KEY) {
      window.location.href = '/'
    }
  }, [])

  if (!CLERK_KEY) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to sign up...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <ClerkSignUp />
    </div>
  )
}
