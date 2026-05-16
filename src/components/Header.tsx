'use client'

import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import {
  Menu, X, Home, Search, Trophy, Calendar, LayoutDashboard, Shield,
  LogIn, UserPlus, LogOut, ChevronDown, User, Bell
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Clerk UserButton — only loaded on client, only when Clerk is configured
const ClerkHeaderSection = CLERK_KEY
  ? dynamic(() => import('@/components/ClerkHeaderSection'), { ssr: false })
  : () => null

export default function Header() {
  const { user, currentPage, navigate, logout, token } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const isLoggedIn = !!user
  const displayName = user?.name || ''
  const displayEmail = user?.email || ''
  const role = user?.role || 'player'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Only fetch pending bookings count for players (not owners/admins)
    if (!isLoggedIn || !token || role !== 'player') return
    fetch('/api/bookings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then((data: any[]) => {
        const count = Array.isArray(data) ? data.filter((b: any) => b.status === 'pending').length : 0
        setPendingCount(count)
      })
      .catch(() => setPendingCount(0))
  }, [isLoggedIn, token, role])

  const navItems = [
    { label: 'Home', page: 'home' as const, icon: Home },
    { label: 'Venues', page: 'venues' as const, icon: Search },
    { label: 'Tournaments', page: 'tournaments' as const, icon: Trophy },
  ]

  // Shared dropdown menu items based on role
  const renderMenuItems = (closeMobile?: () => void) => (
    <>
      {role === 'player' && (
        <>
          <DropdownMenuItem onClick={() => { navigate('my-bookings'); closeMobile?.() }}>
            <Calendar className="w-4 h-4 mr-2" /> My Bookings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { navigate('profile'); closeMobile?.() }}>
            <User className="w-4 h-4 mr-2" /> My Profile
          </DropdownMenuItem>
        </>
      )}
      {role === 'venue_owner' && (
        <DropdownMenuItem onClick={() => { navigate('owner-dashboard'); closeMobile?.() }}>
          <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
        </DropdownMenuItem>
      )}
      {role === 'admin' && (
        <>
          <DropdownMenuItem onClick={() => { navigate('admin-dashboard'); closeMobile?.() }}>
            <Shield className="w-4 h-4 mr-2" /> Admin Panel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { navigate('owner-dashboard'); closeMobile?.() }}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> All Venues
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => { logout(); closeMobile?.() }} className="text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </DropdownMenuItem>
    </>
  )

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md shadow-sm border-b' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => navigate('home')} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">
              Pitch<span className="text-primary">Book</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, page, icon: Icon }) => (
              <Button
                key={page}
                variant={currentPage === page ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate(page)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}

            {isLoggedIn && (
              <>
                {role === 'player' && (
                  <Button
                    variant={currentPage === 'my-bookings' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('my-bookings')}
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="hidden lg:inline">My Bookings</span>
                  </Button>
                )}
                {role === 'player' && (
                  <Button
                    variant={currentPage === 'profile' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('profile')}
                    className="gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">Profile</span>
                  </Button>
                )}
                {role === 'venue_owner' && (
                  <Button
                    variant={currentPage === 'owner-dashboard' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('owner-dashboard')}
                    className="gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden lg:inline">Dashboard</span>
                  </Button>
                )}
                {role === 'admin' && (
                  <Button
                    variant={currentPage === 'admin-dashboard' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('admin-dashboard')}
                    className="gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden lg:inline">Admin</span>
                  </Button>
                )}
                {role === 'player' && pendingCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('my-bookings')}
                    className="gap-2 relative"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="hidden lg:inline">Notifications</span>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  </Button>
                )}
              </>
            )}
          </nav>

          {/* Auth / User Menu */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="hidden sm:inline">{displayName}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  {renderMenuItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => navigate('login')}
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => navigate('register')}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Button>
              </div>
            )}

            {/* Clerk UserButton (client-only, only when Clerk is configured) */}
            <ClerkHeaderSection />

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(({ label, page, icon: Icon }) => (
              <Button
                key={page}
                variant={currentPage === page ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3"
                onClick={() => { navigate(page); setMobileOpen(false) }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
            {isLoggedIn && (
              <>
                {role === 'player' && (
                  <>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('my-bookings'); setMobileOpen(false) }}>
                      <Calendar className="w-4 h-4" /> My Bookings
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('profile'); setMobileOpen(false) }}>
                      <User className="w-4 h-4" /> Profile
                    </Button>
                    {role === 'player' && pendingCount > 0 && (
                      <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('my-bookings'); setMobileOpen(false) }}>
                        <Bell className="w-4 h-4" /> Notifications ({pendingCount})
                      </Button>
                    )}
                  </>
                )}
                {role === 'venue_owner' && (
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('owner-dashboard'); setMobileOpen(false) }}>
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Button>
                )}
                {role === 'admin' && (
                  <>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('admin-dashboard'); setMobileOpen(false) }}>
                      <Shield className="w-4 h-4" /> Admin Panel
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('owner-dashboard'); setMobileOpen(false) }}>
                      <LayoutDashboard className="w-4 h-4" /> All Venues
                    </Button>
                  </>
                )}
              </>
            )}
            {!isLoggedIn && (
              <div className="pt-2 space-y-2">
                <Button variant="outline" className="w-full gap-2" onClick={() => { navigate('login'); setMobileOpen(false) }}>
                  <LogIn className="w-4 h-4" /> Login
                </Button>
                <Button className="w-full gap-2" onClick={() => { navigate('register'); setMobileOpen(false) }}>
                  <UserPlus className="w-4 h-4" /> Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
