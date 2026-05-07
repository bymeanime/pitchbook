'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

// This component attempts to sync Clerk auth with custom auth.
// It's wrapped in error handling so Clerk failures don't break the app.
// Clerk hooks are loaded dynamically to prevent import errors when Clerk is disabled.
export default function ClerkSyncEffect() {
  const { user, token, setAuth, navigate } = useAppStore()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    // If user is already logged in via custom auth, do NOT override with Clerk
    if (user && token) {
      hasSyncedRef.current = true
      return
    }

    if (hasSyncedRef.current) return

    // Dynamically import Clerk hooks - will fail silently if Clerk is not available
    import('@clerk/nextjs').then(({ useUser }) => {
      // We need to call the hook inside a component context.
      // Since we can't call hooks conditionally, we use a different approach:
      // Call the clerk-sync API directly and let the server handle Clerk auth.
      fetch('/api/auth/clerk-sync', { method: 'POST' })
        .then(res => {
          if (!res.ok) {
            // Not authenticated via Clerk - this is expected for custom auth users
            return null
          }
          return res.json()
        })
        .then(data => {
          if (!data) return
          hasSyncedRef.current = true
          if (data.user && data.token) {
            setAuth(data.user, data.token)
            if (data.user.role === 'admin') navigate('admin-dashboard')
            else if (data.user.role === 'venue_owner') navigate('owner-dashboard')
          }
        })
        .catch(() => {
          // Clerk sync failed silently - user can still use custom auth
        })
    }).catch(() => {
      // Clerk not available - custom auth still works
    })
  }, [user, token, setAuth, navigate])

  return null
}
