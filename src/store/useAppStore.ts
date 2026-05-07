import { create } from 'zustand'

export type Page =
  | 'home'
  | 'venues'
  | 'venue-detail'
  | 'tournaments'
  | 'tournament-detail'
  | 'my-bookings'
  | 'profile'
  | 'owner-dashboard'
  | 'admin-dashboard'
  | 'login'
  | 'register'

interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
}

interface AppState {
  // Navigation
  currentPage: Page
  navigate: (page: Page) => void
  previousPage: Page | null

  // Selected items
  selectedVenueId: string | null
  setSelectedVenueId: (id: string | null) => void
  selectedTournamentId: string | null
  setSelectedTournamentId: (id: string | null) => void

  // Auth
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedSport: string
  setSelectedSport: (sport: string) => void
  selectedCity: string
  setSelectedCity: (city: string) => void

  // Filters
  priceRange: [number, number]
  setPriceRange: (range: [number, number]) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'home',
  navigate: (page) => {
    set((state) => ({
      currentPage: page,
      previousPage: state.currentPage,
    }))
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  previousPage: null,

  // Selected items
  selectedVenueId: null,
  setSelectedVenueId: (id) => set({ selectedVenueId: id }),
  selectedTournamentId: null,
  setSelectedTournamentId: (id) => set({ selectedTournamentId: id }),

  // Auth
  user: null,
  token: null,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pb_user', JSON.stringify(user))
      localStorage.setItem('pb_token', token)
    }
    set({ user, token })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pb_user')
      localStorage.removeItem('pb_token')
    }
    set({ user: null, token: null, currentPage: 'home' })
  },
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedSport: '',
  setSelectedSport: (sport) => set({ selectedSport: sport }),
  selectedCity: '',
  setSelectedCity: (city) => set({ selectedCity: city }),

  // Price
  priceRange: [0, 10000],
  setPriceRange: (range) => set({ priceRange: range }),
}))

// Initialize from localStorage
if (typeof window !== 'undefined') {
  try {
    const savedUser = localStorage.getItem('pb_user')
    const savedToken = localStorage.getItem('pb_token')
    if (savedUser && savedToken) {
      useAppStore.setState({
        user: JSON.parse(savedUser),
        token: savedToken,
      })
    }
  } catch {
    // Invalid localStorage data — clear it
    localStorage.removeItem('pb_user')
    localStorage.removeItem('pb_token')
  }
}
