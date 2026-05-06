'use client'

import { useAppStore } from '@/store/useAppStore'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomePage from '@/components/pages/HomePage'
import VenuesPage from '@/components/pages/VenuesPage'
import VenueDetailPage from '@/components/pages/VenueDetailPage'
import TournamentsPage, { TournamentDetailPage } from '@/components/pages/TournamentsPage'
import MyBookingsPage from '@/components/pages/MyBookingsPage'
import ProfilePage from '@/components/pages/ProfilePage'
import OwnerDashboard from '@/components/pages/OwnerDashboard'
import AdminDashboard from '@/components/pages/AdminDashboard'
import LoginPage from '@/components/pages/LoginPage'
import RegisterPage from '@/components/pages/RegisterPage'
import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

export default function App() {
  const { currentPage, user, token, setAuth, navigate } = useAppStore()
  const { isSignedIn, isLoaded, user: clerkUser } = useUser()
  const hasSyncedRef = useRef(false)

  // Restore custom auth from localStorage on mount (one-time only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('pb_user')
        const savedToken = localStorage.getItem('pb_token')
        if (savedUser && savedToken) {
          const parsed = JSON.parse(savedUser)
          useAppStore.setState({ user: parsed, token: savedToken })
        }
      } catch {
        localStorage.removeItem('pb_user')
        localStorage.removeItem('pb_token')
      }
    }
  }, [])

  // Sync Clerk user to custom auth store
  // CRITICAL: Always re-sync when Clerk is signed in, even if stale localStorage
  // data exists with a wrong role. This ensures the DB role (admin/venue_owner)
  // is always used instead of a previously-cached wrong role.
  useEffect(() => {
    if (!isLoaded) return // Wait for Clerk to finish loading
    if (hasSyncedRef.current) return // Only sync once per mount

    if (isSignedIn) {
      hasSyncedRef.current = true

      // Always call clerk-sync when Clerk is signed in, regardless of stored user.
      // The backend matches by email and returns the correct DB role.
      fetch('/api/auth/clerk-sync', { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error(`Sync failed (${res.status})`)
          return res.json()
        })
        .then(data => {
          if (data.user && data.token) {
            setAuth(data.user, data.token)
            // Auto-navigate to appropriate dashboard based on role
            if (data.user.role === 'admin') navigate('admin-dashboard')
            else if (data.user.role === 'venue_owner') navigate('owner-dashboard')
          }
        })
        .catch((err) => {
          console.error('Clerk sync failed:', err.message)
          // Sync failed — user can still browse but can't book
          // Clear any stale auth data that might have wrong role
          const clerkEmail = clerkUser?.emailAddresses?.[0]?.emailAddress
          const storedEmail = user?.email
          if (clerkEmail && storedEmail && clerkEmail !== storedEmail) {
            // Different user signed in — clear old data
            useAppStore.setState({ user: null, token: null })
            localStorage.removeItem('pb_user')
            localStorage.removeItem('pb_token')
          }
        })
    } else if (!isSignedIn && user) {
      // Clerk user signed out — also clear custom auth
      useAppStore.setState({ user: null, token: null, currentPage: 'home' })
      localStorage.removeItem('pb_user')
      localStorage.removeItem('pb_token')
      hasSyncedRef.current = false
    }
  }, [isSignedIn, isLoaded]) // Intentionally minimal deps to avoid re-triggering

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />
      case 'venues': return <VenuesPage />
      case 'venue-detail': return <VenueDetailPage />
      case 'tournaments': return <TournamentsPage />
      case 'tournament-detail': return <TournamentDetailPage />
      case 'my-bookings': return <MyBookingsPage />
      case 'profile': return <ProfilePage />
      case 'owner-dashboard': return <OwnerDashboard />
      case 'admin-dashboard': return <AdminDashboard />
      case 'login': return <LoginPage />
      case 'register': return <RegisterPage />
      default: return <HomePage />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer />
    </div>
  )
}
