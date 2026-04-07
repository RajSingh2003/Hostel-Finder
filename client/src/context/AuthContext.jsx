import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

// Set base URL once — works for both Vite proxy (/api → :5000) in dev
// and direct calls in production. Never empty-string.
const SERVER = import.meta.env.VITE_SERVER_URL || ''
if (SERVER) {
  axios.defaults.baseURL = SERVER
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem('sf_token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe()
    } else {
      delete axios.defaults.headers.common['Authorization']
      setLoading(false)
    }
  }, [token])

  async function fetchMe() {
    try {
      const { data } = await axios.get('/api/auth/me')
      setUser(data.user)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data } = await axios.post('/api/auth/login', { email, password })
    localStorage.setItem('sf_token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function register(payload) {
    const { data } = await axios.post('/api/auth/register', payload)
    localStorage.setItem('sf_token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }

  function logout() {
    localStorage.removeItem('sf_token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  async function toggleWishlist(propertyId) {
    if (!token) return false
    const { data } = await axios.put(`/api/auth/wishlist/${propertyId}`)
    setUser(prev => ({ ...prev, wishlist: data.wishlist }))
    return data.wishlist
  }

  const isWishlisted = (id) => user?.wishlist?.some(w => (w._id || w) === id)

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, toggleWishlist, isWishlisted }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
