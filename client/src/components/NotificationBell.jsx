import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'

const TIME_FMT = (d) => {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

const TYPE_COLOR = {
  booking_approved:  '#22c55e',
  booking_rejected:  '#ef4444',
  booking_cancelled: '#ef4444',
  payment_success:   '#22c55e',
  payment_received:  '#22c55e',
  new_message:       '#3b82f6',
  new_review:        '#f5a623',
  welcome:           '#e94560',
  property_approved: '#22c55e',
  property_rejected: '#ef4444',
  booking_request:   '#0f3460',
  price_alert:       '#f5a623',
}

export default function NotificationBell() {
  const { user }         = useAuth()
  const navigate         = useNavigate()
  const {
    notifications, unreadCount, open, setOpen,
    loading, markRead, markAllRead, deleteNotif, clearAll, TYPE_ICONS,
  } = useNotifications()

  const drawerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  async function handleClick(notif) {
    if (!notif.read) await markRead(notif._id)
    setOpen(false)
    if (notif.link) navigate(notif.link)
  }

  return (
    <div style={{ position:'relative' }} ref={drawerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:       'relative',
          background:     open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          border:         'none',
          borderRadius:   8,
          width:          38,
          height:         38,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          cursor:         'pointer',
          fontSize:       '1.15rem',
          transition:     'background 0.2s',
          flexShrink:     0,
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position:       'absolute',
            top:            -4,
            right:          -4,
            background:     '#e94560',
            color:          '#fff',
            borderRadius:   '50%',
            minWidth:       18,
            height:         18,
            fontSize:       '0.6rem',
            fontWeight:     700,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '0 3px',
            border:         '2px solid #1a1a2e',
            fontFamily:     'DM Sans,sans-serif',
            lineHeight:     1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div style={{
          position:     'absolute',
          top:          'calc(100% + 10px)',
          right:        0,
          width:        'min(380px, 92vw)',
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow:    '0 12px 40px rgba(26,26,46,0.18)',
          zIndex:       500,
          display:      'flex',
          flexDirection:'column',
          maxHeight:    '80vh',
          overflow:     'hidden',
        }}>

          {/* Header */}
          <div style={{ padding:'1rem 1.25rem 0.75rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <span style={{ fontWeight:600, fontSize:'0.95rem', fontFamily:'Playfair Display,serif' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ marginLeft:'0.5rem', background:'var(--accent)', color:'#fff', borderRadius:20, padding:'0.1rem 0.5rem', fontSize:'0.68rem', fontWeight:700 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:'0.4rem' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'0.75rem', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:600, padding:'0.2rem 0.4rem' }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:'0.75rem', cursor:'pointer', fontFamily:'DM Sans,sans-serif', padding:'0.2rem 0.4rem' }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading && (
              <div style={{ padding:'2rem', textAlign:'center' }}>
                <div className="spinner" style={{ width:24, height:24, margin:'0 auto' }} />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ padding:'2.5rem 1rem', textAlign:'center', color:'var(--text2)' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🔔</div>
                <div style={{ fontWeight:600, marginBottom:'0.25rem', fontSize:'0.9rem' }}>All caught up!</div>
                <div style={{ fontSize:'0.8rem' }}>No notifications yet.</div>
              </div>
            )}

            {notifications.map((notif, i) => (
              <div
                key={notif._id || i}
                onClick={() => handleClick(notif)}
                style={{
                  display:     'flex',
                  gap:         '0.75rem',
                  padding:     '0.85rem 1.25rem',
                  cursor:      'pointer',
                  background:  notif.read ? 'transparent' : 'rgba(233,69,96,0.04)',
                  borderBottom:'1px solid var(--border)',
                  transition:  'background 0.15s',
                  position:    'relative',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(233,69,96,0.04)'}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />
                )}

                {/* Icon */}
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background: (TYPE_COLOR[notif.type] || '#888') + '18',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'1rem', border:`1.5px solid ${(TYPE_COLOR[notif.type] || '#888')}30`,
                }}>
                  {TYPE_ICONS[notif.type] || '🔔'}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight: notif.read ? 500 : 600, fontSize:'0.82rem', marginBottom:'0.2rem', color:'var(--text)' }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize:'0.77rem', color:'var(--text2)', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginTop:'0.3rem' }}>
                    {TIME_FMT(notif.createdAt)}
                  </div>
                </div>

                {/* Delete X */}
                <button
                  onClick={e => { e.stopPropagation(); deleteNotif(notif._id) }}
                  style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'0.9rem', padding:'0.2rem', flexShrink:0, alignSelf:'flex-start', marginTop:2 }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding:'0.6rem', borderTop:'1px solid var(--border)', textAlign:'center', flexShrink:0 }}>
              <button
                onClick={() => { setOpen(false); navigate('/dashboard') }}
                style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'0.78rem', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:600 }}
              >
                View all in Dashboard →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
