'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Heart, Github, Twitter, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  const { navigate } = useAppStore()

  return (
    <footer className="bg-secondary/50 border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">
                Pitch<span className="text-primary">Book</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Book game venues instantly. Join tournaments. Play your favorite sports with ease.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="ghost" size="icon" className="w-8 h-8"><Twitter className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8"><Github className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8"><Mail className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">For Players</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate('venues')} className="hover:text-primary transition-colors">Browse Venues</button></li>
              <li><button onClick={() => navigate('tournaments')} className="hover:text-primary transition-colors">Tournaments</button></li>
              <li><button onClick={() => navigate('my-bookings')} className="hover:text-primary transition-colors">My Bookings</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">For Venues</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate('register')} className="hover:text-primary transition-colors">List Your Venue</button></li>
              <li><button onClick={() => navigate('owner-dashboard')} className="hover:text-primary transition-colors">Owner Dashboard</button></li>
              <li><button onClick={() => navigate('register')} className="hover:text-primary transition-colors">Pricing Plans</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Kathmandu, Nepal</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +977-9800000000</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> hello@pitchbook.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2025 PitchBook. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-destructive fill-destructive" /> for sports lovers
          </p>
        </div>
      </div>
    </footer>
  )
}
