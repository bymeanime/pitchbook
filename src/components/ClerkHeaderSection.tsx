'use client'

import { useUser, UserButton } from '@clerk/nextjs'

// This component MUST only render on the client (imported with dynamic + ssr: false).
// It calls Clerk's useUser() and renders UserButton.
export default function ClerkHeaderSection() {
  const { isSignedIn } = useUser()

  if (!isSignedIn) return null

  return (
    <UserButton
      appearance={{
        elements: { avatarBox: "w-9 h-9" },
      }}
    />
  )
}
