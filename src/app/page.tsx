'use client'

import dynamic from 'next/dynamic'
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
import { useEffect } from 'react'

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Clerk sync — only loaded on client, only rendered when Clerk is configured
const ClerkSyncEffect = CLERK_KEY
  ? dynamic(() => import('@/components/ClerkSyncEffect'), { ssr: false })
  : () => null

export default function App() {
  const { currentPage } = useAppStore()

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
      <ClerkSyncEffect />
    </div>
  )
}
