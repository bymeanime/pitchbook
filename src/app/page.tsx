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
import { useEffect } from 'react'

export default function App() {
  const { currentPage, user, token, setAuth } = useAppStore()
  const { isSignedIn, isLoaded } = useUser()

  // Restore custom auth from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !user) {
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
  // This ensures that users who sign in via Clerk's UI can use
  // features that depend on the custom auth (user/token) like booking, reviews, etc.
  useEffect(() => {
    if (!isLoaded) return // Wait for Clerk to finish loading

    if (isSignedIn && !user) {
      // Clerk user is signed in but no custom auth — sync them
      fetch('/api/auth/clerk-sync', { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error('Sync failed')
          return res.json()
        })
        .then(data => {
          setAuth(data.user, data.token)
        })
        .catch(() => {
          // Sync failed — user can still browse but can't book
        })
    } else if (!isSignedIn && user) {
      // Clerk user signed out — also clear custom auth
      // (only if the stored user was a Clerk-synced one)
      if (user.email?.includes('@pitchbook.local')) {
        useAppStore.setState({ user: null, token: null, currentPage: 'home' })
        localStorage.removeItem('pb_user')
        localStorage.removeItem('pb_token')
      }
    }
  }, [isSignedIn, isLoaded, user, setAuth])

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
