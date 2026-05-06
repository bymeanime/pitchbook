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
  const { isSignedIn, isLoaded } = useUser()
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

  // Clerk sync — ONLY if:
  // 1. Clerk user is signed in
  // 2. There is NO existing custom auth user (user logged in via custom login, not Clerk)
  // 3. Haven't synced yet in this session
  //
  // This way, custom auth login is never overridden by Clerk sync.
  // Clerk sync only kicks in for users who sign up via Clerk's UI.
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

      // Clerk user signed in but no custom auth — sync them
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
