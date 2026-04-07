import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

const NotificationContext = createContext(null)

const TYPE_ICONS = {
  booking_request:   '🔔',
  booking_approved:  '✅',
  booking_rejected:  '❌',
  booking_cancelled: '🚫',
  payment_received:  '💵',
  payment_success:   '💰',
  new_message:       '💬',
  new_review:        '⭐',
  price_alert:       '📊',
  welcome:           '🎉',
  property_approved: '✅',
  property_rejected: '❌',
}

export function NotificationProvider({ children }) {
  const { user, token } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [open,          setOpen]          = useState(false)
  const [loading,       setLoading]       = useState(false)
  // Own lightweight socket just for notifications
  const notifSocket = useRef(null)

  // Load notifications from API
  useEffect(() => {
    if (user) { fetchAll() } else { setNotifications([]); setUnreadCount(0) }
  }, [user])

  // Separate socket listener for notifications only
  useEffect(() => {
    if (!user || !token) return

    const sock = io(
      import.meta.env.VITE_SERVER_URL || 'http://localhost:5000',
      { auth: { token }, transports: ['websocket', 'polling'] }
    )
    notifSocket.current = sock

    sock.on('connect', () => sock.emit('user_online', user.id))

    sock.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev])
      setUnreadCount(n => n + 1)
      toast(
        `${TYPE_ICONS[notif.type] || '🔔'} ${notif.title}`,
        { duration: 4000, style: { background: 'var(--primary)', color: '#fff', fontSize: '0.82rem' } }
      )
    })

    return () => { sock.disconnect(); notifSocket.current = null }
  }, [user?.id, token])

  async function fetchAll() {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/notifications?limit=30')
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {}
    finally { setLoading(false) }
  }

  const markRead = useCallback(async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      setUnreadCount(n => Math.max(0, n - 1))
    } catch {}
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await axios.put('/api/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }, [])

  const deleteNotif = useCallback(async (id) => {
    const wasUnread = notifications.find(n => n._id === id && !n.read)
    try {
      await axios.delete(`/api/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n._id !== id))
      if (wasUnread) setUnreadCount(n => Math.max(0, n - 1))
    } catch {}
  }, [notifications])

  const clearAll = useCallback(async () => {
    try {
      await axios.delete('/api/notifications/clear-all')
      setNotifications([])
      setUnreadCount(0)
    } catch {}
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, open, setOpen,
      loading, TYPE_ICONS,
      markRead, markAllRead, deleteNotif, clearAll,
      fetchNotifications: fetchAll,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
