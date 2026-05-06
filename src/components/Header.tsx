'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import {
  Menu, X, Home, Search, Trophy, Calendar, LayoutDashboard, Shield,
  LogIn, UserPlus, LogOut, ChevronDown, User
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserButton, useUser } from '@clerk/nextjs'

export default function Header() {
  const { user, currentPage, navigate, logout } = useAppStore()
  const { isSignedIn, user: clerkUser } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { label: 'Home', page: 'home' as const, icon: Home },
    { label: 'Venues', page: 'venues' as const, icon: Search },
    { label: 'Tournaments', page: 'tournaments' as const, icon: Trophy },
  ]

  // Use Clerk user if available, fallback to custom auth
  const displayName = clerkUser?.fullName || clerkUser?.emailAddresses?.[0]?.emailAddress || user?.name || ''
  const displayEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || user?.email || ''
  const isLoggedIn = isSignedIn || !!user

  // Determine the actual role (from our custom auth store)
  const role = user?.role || 'player'

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
              </>
            )}
          </nav>

          {/* Auth / User Menu */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              // ── Logged in (Clerk or custom auth) ──
              <>
                {user && (
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
                        <p className="text-sm font-medium">{displayName || user.name}</p>
                        <p className="text-xs text-muted-foreground">{displayEmail || user.email}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                          {role.replace('_', ' ')}
                        </span>
                      </div>
                      <DropdownMenuSeparator />
                      {renderMenuItems()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {isSignedIn && (
                  <UserButton
                    appearance={{
                      elements: { avatarBox: "w-9 h-9" },
                    }}
                  />
                )}
              </>
            ) : (
              // ── Not logged in — show BOTH auth options ──
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
