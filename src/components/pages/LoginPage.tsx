'use client'

import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { LogIn, Mail, Lock, User, Phone, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const { navigate, setAuth } = useAppStore()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      setAuth(data.user, data.token)
      toast({ title: `Welcome back, ${data.user.name}!` })

      // Navigate based on role
      if (data.user.role === 'admin') navigate('admin-dashboard')
      else if (data.user.role === 'venue_owner') navigate('owner-dashboard')
      else navigate('home')
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-primary mx-auto mb-3 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">P</span>
          </div>
          <CardTitle className="text-xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your PitchBook account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6 pt-4 border-t">
            Don&apos;t have an account?{' '}
            <button className="text-primary font-medium hover:underline" onClick={() => navigate('register')}>
              Sign up
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
