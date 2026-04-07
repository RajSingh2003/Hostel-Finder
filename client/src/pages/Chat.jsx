import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth }   from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import axios from 'axios'
import toast from 'react-hot-toast'

// Deterministic room ID — same for both users, always
const mkRoom = (a, b) => [String(a), String(b)].sort().join('_')

// Coloured initials avatar
function Av({ name = '?', size = 38 }) {
  const initials = (name || '?').trim().split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()
  const pal = ['#e94560','#0f3460','#0891b2','#7c3aed','#d97706','#1a6b3c']
  const bg  = pal[(name.charCodeAt(0) || 0) % pal.length]
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:bg, color:'#fff', fontWeight:700,
      fontSize:Math.round(size*0.36),
      display:'flex', alignItems:'center', justifyContent:'center',
      userSelect:'none',
    }}>{initials}</div>
  )
}

function TimeAgo({ iso }) {
  const d    = new Date(iso), now = new Date()
  const mins = Math.floor((now - d) / 60000)
  if (mins < 1)    return <span>now</span>
  if (mins < 60)   return <span>{mins}m</span>
  if (mins < 1440) return <span>{d.getHours()}:{String(d.getMinutes()).padStart(2,'0')}</span>
  return <span>{d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
}

export default function Chat() {
  const { userId: otherId } = useParams()
  const { user }  = useAuth()
  const {
    joinRoom, sendMsg, onRoomMessage,
    onTyping, emitTyping, emitStopTyping, isOnline, connected,
  } = useSocket()
  const navigate = useNavigate()

  const [msgs,    setMsgs]    = useState([])
  const [other,   setOther]   = useState(null)
  const [input,   setInput]   = useState('')
  const [typing,  setTyping]  = useState(false)
  const [loading, setLoading] = useState(true)
  const [rid,     setRid]     = useState('')

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const stopTimer  = useRef(null)
  const seenIds    = useRef(new Set())

  // ── Init: load history, join room ─────────────────────────────────────────
  useEffect(() => {
    if (!user)    { navigate('/auth'); return }
    if (!otherId) return

    const room = mkRoom(user._id, otherId)
    setRid(room)
    setMsgs([])
    seenIds.current.clear()
    setLoading(true)

    // Fetch other user's name/info
    axios.get(`/api/auth/user/${otherId}`)
      .then(r => setOther(r.data.user))
      .catch(() => setOther({ _id: otherId, name: 'User' }))

    // Fetch message history from DB
    axios.get(`/api/chat/history/${otherId}`)
      .then(r => {
        const history = r.data.messages || []
        history.forEach(m => seenIds.current.add(m._id?.toString()))
        setMsgs(history)
        // Mark messages as read (fire-and-forget, never crash on failure)
        axios.put(`/api/chat/read/${room}`).catch(() => {})
      })
      .catch(() => setMsgs([]))
      .finally(() => {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 150)
      })

    // Join Socket.io room (handles connect-wait internally)
    joinRoom(room)

    return () => { clearTimeout(stopTimer.current) }
  }, [otherId, user?._id])

  // ── Subscribe to incoming real-time messages ──────────────────────────────
  useEffect(() => {
    if (!rid) return
    const unsub = onRoomMessage(rid, (msg) => {
      const id       = msg._id?.toString()
      const senderId = (msg.sender?._id || msg.sender)?.toString()
      const myId = user?._id?.toString()

      if (id && seenIds.current.has(id)) return
      if (id) seenIds.current.add(id)

      setMsgs(prev => {
        if (senderId === myId) {
          // Server echo of my own message → replace the _temp placeholder
          const tempIdx = [...prev].reverse().findIndex(m => m._temp)
          if (tempIdx !== -1) {
            const realIdx = prev.length - 1 - tempIdx
            const next    = [...prev]
            next[realIdx] = { ...msg, _temp: false }
            return next
          }
          return [...prev, msg]
        }
        return [...prev, msg]
      })
      setTyping(false)
    })
    return unsub
  }, [rid, user?.id])

  // ── Typing indicator ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!rid) return
    const unsub = onTyping(rid, (isTyping) => setTyping(isTyping))
    return unsub
  }, [rid])

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length, typing])

  // ── Send message ──────────────────────────────────────────────────────────
  function send() {
    const text = input.trim()
    if (!text || !rid) return

    // Show immediately (optimistic)
    const tempId = '_tmp_' + Date.now()
    setMsgs(prev => [...prev, {
      _id:       tempId,
      sender: { _id: user._id, name: user.name },
      receiver:  otherId,
      room:      rid,
      text,
      createdAt: new Date().toISOString(),
      _temp:     true,
    }])
    setInput('')
    emitStopTyping(rid)

    const sent = sendMsg({ senderId: user._id, receiverId: otherId, roomId: rid, text })
    if (!sent) {
      // Socket not connected — remove optimistic, restore input
      setMsgs(prev => prev.filter(m => m._id !== tempId))
      setInput(text)
      toast.error('Not connected. Please wait a moment and try again.')
    }

    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleInput(e) {
    setInput(e.target.value)
    emitTyping(rid)
    clearTimeout(stopTimer.current)
    stopTimer.current = setTimeout(() => emitStopTyping(rid), 1500)
    // Auto-grow textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const isMine = (m) => (m.sender?._id || m.sender)?.toString() === user?._id?.toString()
  const online = other?._id ? isOnline(other._id) : false

  if (!user) return null

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'100dvh', paddingTop:'var(--nav-h)',
    }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        background:'var(--primary)', padding:'0.7rem 1rem',
        display:'flex', alignItems:'center', gap:'0.75rem',
        flexShrink:0, boxShadow:'0 2px 10px rgba(0,0,0,0.2)',
      }}>
        <button onClick={() => navigate(-1)} style={{
          background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
          borderRadius:8, padding:'0.38rem 0.7rem', cursor:'pointer', fontSize:'0.9rem',
        }}>←</button>

        <Av name={other?.name || 'U'} size={38} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            color:'#fff', fontWeight:600, fontSize:'0.92rem',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {loading ? '…' : other?.name || 'User'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{
              width:7, height:7, borderRadius:'50%', display:'inline-block',
              background: typing ? '#facc15' : online ? '#4ade80' : 'rgba(255,255,255,0.3)',
            }} />
            <span style={{
              fontSize:'0.7rem',
              color: typing ? '#facc15' : online ? '#4ade80' : 'rgba(255,255,255,0.45)',
            }}>
              {typing ? 'typing…' : online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────── */}
      <div style={{
        flex:1, overflowY:'auto', padding:'0.85rem 1rem',
        display:'flex', flexDirection:'column', gap:'3px',
        background:'#f0ede8',
      }}>

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && msgs.length === 0 && (
          <div style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--text2)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>👋</div>
            <div style={{ fontWeight:600, marginBottom:'0.3rem', fontSize:'0.95rem' }}>
              Start the conversation
            </div>
            <div style={{ fontSize:'0.82rem', color:'var(--text3)' }}>
              Say hello to {other?.name || 'this user'}
            </div>
          </div>
        )}

        {msgs.map((msg, i) => {
          const mine  = isMine(msg)
          const prev  = msgs[i - 1]
          const showDate = !prev ||
            new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString()
          const grouped = prev && isMine(prev) === mine && !showDate

          return (
            <div key={msg._id || i}>
              {showDate && (
                <div style={{
                  textAlign:'center', margin:'0.75rem 0',
                  fontSize:'0.7rem', color:'var(--text3)',
                }}>
                  <span style={{
                    background:'rgba(255,255,255,0.8)',
                    padding:'0.2rem 0.85rem', borderRadius:20,
                    border:'1px solid var(--border)',
                  }}>
                    {new Date(msg.createdAt).toLocaleDateString('en-IN',{
                      weekday:'long', day:'numeric', month:'short',
                    })}
                  </span>
                </div>
              )}

              <div style={{
                display:'flex',
                justifyContent: mine ? 'flex-end' : 'flex-start',
                alignItems:'flex-end',
                gap:'0.4rem',
                marginTop: grouped ? 1 : 8,
              }}>
                {/* Avatar — show on first of consecutive group from other user */}
                {!mine && (
                  grouped
                    ? <div style={{ width:26 }} />
                    : <Av name={other?.name || 'U'} size={26} />
                )}

                <div style={{ maxWidth:'74%' }}>
                  <div style={{
                    background:   mine ? 'var(--accent2)' : '#ffffff',
                    color:        mine ? '#fff' : 'var(--text)',
                    borderRadius: mine
                      ? (grouped ? '18px 6px 6px 18px' : '18px 18px 4px 18px')
                      : (grouped ? '6px 18px 18px 4px'  : '4px 18px 18px 18px'),
                    padding:     '0.55rem 0.95rem',
                    fontSize:    '0.875rem',
                    lineHeight:  1.55,
                    border:      mine ? 'none' : '1px solid #e8e5df',
                    wordBreak:   'break-word',
                    whiteSpace:  'pre-wrap',
                    opacity:     msg._temp ? 0.65 : 1,
                    boxShadow:   '0 1px 2px rgba(0,0,0,0.07)',
                    transition:  'opacity 0.2s',
                  }}>
                    {msg.text}
                  </div>

                  {/* Timestamp + tick — show only on last of group */}
                  {(!msgs[i+1] || isMine(msgs[i+1]) !== mine ||
                    new Date(msgs[i+1]?.createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                  ) && (
                    <div style={{
                      fontSize:'0.62rem', color:'var(--text3)', marginTop:3,
                      display:'flex', gap:4, alignItems:'center',
                      justifyContent: mine ? 'flex-end' : 'flex-start',
                    }}>
                      <TimeAgo iso={msg.createdAt} />
                      {mine && (
                        <span style={{ color: msg._temp ? '#94a3b8' : '#4ade80' }}>
                          {msg._temp ? '⏳' : '✓✓'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing dots */}
        {typing && !loading && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:'0.4rem', marginTop:8 }}>
            <Av name={other?.name || 'U'} size={26} />
            <div style={{
              background:'#fff', border:'1px solid var(--border)',
              borderRadius:'4px 18px 18px 18px',
              padding:'0.55rem 0.9rem', display:'flex', gap:4,
            }}>
              {[0,1,2].map(k=>(
                <div key={k} style={{
                  width:7, height:7, borderRadius:'50%', background:'var(--text3)',
                  animation:`tdot 1.2s ${k*0.18}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────── */}
      <div style={{
        background:'#fff', borderTop:'1px solid var(--border)',
        padding:'0.65rem 1rem',
        paddingBottom:'calc(0.65rem + env(safe-area-inset-bottom, 0px))',
        display:'flex', gap:'0.5rem', alignItems:'flex-end', flexShrink:0,
      }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Message…"
          style={{
            flex:1, border:'1px solid var(--border)', borderRadius:24,
            padding:'0.6rem 1rem', fontSize:'0.9rem',
            fontFamily:'DM Sans, sans-serif', outline:'none',
            color:'var(--text)', background:'#f8f7f4',
            resize:'none', maxHeight:120, lineHeight:1.5,
            transition:'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e  => e.target.style.borderColor='var(--border)'}
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          style={{
            width:44, height:44, borderRadius:'50%', flexShrink:0,
            background: input.trim() ? 'var(--accent)' : '#d1d5db',
            color:'#fff', border:'none',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontSize:'1.05rem', display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.15s, transform 0.1s',
          }}
          onMouseDown={e => { if(input.trim()) e.currentTarget.style.transform='scale(0.9)' }}
          onMouseUp={e   => e.currentTarget.style.transform='scale(1)'}
        >➤</button>
      </div>

      <style>{`
        @keyframes tdot {
          0%,60%,100% { transform:translateY(0); }
          30%          { transform:translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
