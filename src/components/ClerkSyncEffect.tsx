'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAppStore } from '@/store/useAppStore'

// This component MUST only render on the client (imported with dynamic + ssr: false).
// It calls Clerk's useUser() hook which requires browser environment.
export default function ClerkSyncEffect() {
  const { isSignedIn, isLoaded } = useUser()
  const { user, token, setAuth, navigate } = useAppStore()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return
    if (hasSyncedRef.current) return

    // If user is already logged in via custom auth, do NOT override with Clerk
    if (user && token) {
      hasSyncedRef.current = true
      return
    }

    if (isSignedIn && !user) {
      hasSyncedRef.current = true

      fetch('/api/auth/clerk-sync', { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error(`Sync failed (${res.status})`)
          return res.json()
        })
        .then(data => {
          if (data.user && data.token) {
            setAuth(data.user, data.token)
            if (data.user.role === 'admin') navigate('admin-dashboard')
            else if (data.user.role === 'venue_owner') navigate('owner-dashboard')
          }
        })
        .catch((err) => {
          console.error('Clerk sync failed:', err.message)
        })
    }
  }, [isSignedIn, isLoaded, user, token, setAuth, navigate])

  return null
}
