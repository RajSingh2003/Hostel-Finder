import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

// ✅ Backend URL
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

export function SocketProvider({ children }) {
  const { user, token } = useAuth()
  const socketRef = useRef(null)

  const msgCbs = useRef({})
  const typingCbs = useRef({})

  const [onlineUsers, setOnlineUsers] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user?._id || !token) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    // ✅ Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    })

    socketRef.current = socket

    // ✅ On connect
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
      console.log('👤 User:', user._id)

      setIsConnected(true)

      // ✅ Register user
      socket.emit('user_online', user._id)

      // ✅ Rejoin rooms
      Object.keys(msgCbs.current).forEach(roomId => {
        socket.emit('join_room', roomId)
      })
    })

    // ❌ On disconnect
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error('❌ Socket error:', err.message)
    })

    // ✅ Online users
    socket.on('online_users', setOnlineUsers)

    // ✅ Receive messages
    socket.on('new_message', (msg) => {
      const callbacks = msgCbs.current[msg.room] || []
      callbacks.forEach(cb => cb(msg))
    })

    // ✅ Typing
    socket.on('typing', (roomId) => {
      typingCbs.current[roomId]?.(true)
    })

    socket.on('stop_typing', (roomId) => {
      typingCbs.current[roomId]?.(false)
    })

    return () => {
      socket.off()
      socket.disconnect()
      socketRef.current = null
    }

  }, [user?._id, token])

  // ✅ Join room
  const joinRoom = useCallback((roomId) => {
    const s = socketRef.current
    if (!s || !roomId) return

    if (s.connected) {
      s.emit('join_room', roomId)
    } else {
      s.once('connect', () => {
        s.emit('join_room', roomId)
      })
    }
  }, [])

  // ✅ Send message
  const sendMsg = useCallback((payload) => {
    const s = socketRef.current

    if (!s) {
      console.warn('❌ Socket not initialized')
      return false
    }

    if (!s.connected) {
      console.warn('❌ Socket not connected')
      return false
    }

    console.log('📤 Sending:', payload)

    s.emit('send_message', payload)
    return true
  }, [])

  // ✅ Subscribe messages
  const onRoomMessage = useCallback((roomId, cb) => {
    if (!roomId || typeof cb !== 'function') return () => {}

    if (!msgCbs.current[roomId]) {
      msgCbs.current[roomId] = []
    }

    msgCbs.current[roomId].push(cb)

    // auto join
    joinRoom(roomId)

    return () => {
      msgCbs.current[roomId] =
        msgCbs.current[roomId].filter(fn => fn !== cb)
    }
  }, [joinRoom])

  // ✅ Typing subscribe
  const onTyping = useCallback((roomId, cb) => {
    if (!roomId || typeof cb !== 'function') return () => {}
    typingCbs.current[roomId] = cb
    return () => delete typingCbs.current[roomId]
  }, [])

  const emitTyping = (roomId) =>
    socketRef.current?.emit('typing', roomId)

  const emitStopTyping = (roomId) =>
    socketRef.current?.emit('stop_typing', roomId)

  // ✅ Online check
  const isOnline = useCallback(
    (uid) => uid ? onlineUsers.includes(uid.toString()) : false,
    [onlineUsers]
  )

  return (
    <SocketContext.Provider value={{
      joinRoom,
      sendMsg,
      onRoomMessage,
      onTyping,
      emitTyping,
      emitStopTyping,
      isOnline,
      onlineUsers,
      connected: isConnected
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)