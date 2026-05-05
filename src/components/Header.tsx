'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import {
  Menu, X, Home, Search, Trophy, Calendar, LayoutDashboard, Shield,
  LogIn, UserPlus, LogOut, ChevronDown
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Header() {
  const { user, currentPage, navigate, logout } = useAppStore()
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

            {user && (
              <>
                <Button
                  variant={currentPage === 'my-bookings' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('my-bookings')}
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  My Bookings
                </Button>
                {(user.role === 'venue_owner' || user.role === 'admin') && (
                  <Button
                    variant={currentPage === 'owner-dashboard' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('owner-dashboard')}
                    className="gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                )}
                {user.role === 'admin' && (
                  <Button
                    variant={currentPage === 'admin-dashboard' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('admin-dashboard')}
                    className="gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Button>
                )}
              </>
            )}
          </nav>

          {/* Auth / User Menu */}
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{user.name.charAt(0)}</span>
                    </div>
                    <span className="hidden sm:inline">{user.name}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('my-bookings')}>
                    <Calendar className="w-4 h-4 mr-2" /> My Bookings
                  </DropdownMenuItem>
                  {(user.role === 'venue_owner' || user.role === 'admin') && (
                    <DropdownMenuItem onClick={() => navigate('owner-dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('login')} className="gap-1">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
                <Button size="sm" onClick={() => navigate('register')} className="gap-1">
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
            {user && (
              <>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('my-bookings'); setMobileOpen(false) }}>
                  <Calendar className="w-4 h-4" /> My Bookings
                </Button>
                {(user.role === 'venue_owner' || user.role === 'admin') && (
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('owner-dashboard'); setMobileOpen(false) }}>
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Button>
                )}
                {user.role === 'admin' && (
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { navigate('admin-dashboard'); setMobileOpen(false) }}>
                    <Shield className="w-4 h-4" /> Admin Panel
                  </Button>
                )}
                <Button variant="destructive" className="w-full justify-start gap-3 mt-2" onClick={() => { logout(); setMobileOpen(false) }}>
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
