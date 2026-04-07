import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { myBookings, ownerBookings, myListings, updateBookingStatus } from '../utils/api'
import axios from 'axios'
import toast from 'react-hot-toast'

/* ── Helpers ─────────────────────────────────────────────────── */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ── Price Compare Chart ──────────────────────────────────────── */
function CompareChart({ bookings }) {
  if (!bookings.length) return <p style={{ color:'var(--text2)', fontSize:'0.83rem' }}>No booking data.</p>
  const max = Math.max(...bookings.map(b => b.property?.price || 0), 1)
  return (
    <div>
      {bookings.slice(0, 5).map(b => {
        if (!b.property) return null
        const lw = Math.round((b.property.price / max) * 100)
        const aw = Math.round(((b.property.aiPredictedPrice || b.property.price) / max) * 100)
        return (
          <div key={b._id} className="compare-row">
            <div className="compare-label">{b.property.title?.split(' ').slice(0,2).join(' ')}</div>
            <div className="compare-bars">
              <div className="compare-bar" style={{ width:`${lw}%`, background:'#ef4444' }}>₹{b.property.price?.toLocaleString()}</div>
              <div className="compare-bar" style={{ width:`${aw}%`, background:'#22c55e' }}>₹{(b.property.aiPredictedPrice||b.property.price)?.toLocaleString()}</div>
            </div>
          </div>
        )
      })}
      <div style={{ display:'flex', gap:'1rem', marginTop:'0.65rem', fontSize:'0.72rem', flexWrap:'wrap' }}>
        <span><span style={{ display:'inline-block', width:10, height:10, background:'#ef4444', borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Listed</span>
        <span><span style={{ display:'inline-block', width:10, height:10, background:'#22c55e', borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>AI Fair</span>
      </div>
    </div>
  )
}

/* ── Conversations list ─────────────────────────────────────── */
function ChatWidget() {
  const navigate = useNavigate()
  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/chat/conversations')
      .then(r => setConvs(r.data.conversations || []))
      .catch(() => setConvs([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>

  if (convs.length === 0) return (
    <div className="empty">
      <div className="empty-icon">💬</div>
      <p>No conversations yet.</p>
      <p style={{ fontSize:'0.82rem', color:'var(--text2)', marginTop:'0.35rem' }}>
        Chat with property owners from the listing page, or connect with roommate matches.
      </p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
      {convs.map((c, i) => {
        const lastMsg  = c.lastMessage
        const sender   = lastMsg?.sender
        const otherUID = sender?._id
        const name     = sender?.name || 'User'
        const initials = name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
        const palette  = ['#e94560','#0f3460','#1a6b3c','#7c3aed','#d97706']
        const bg       = palette[(name.charCodeAt(0)||0) % palette.length]
        const timeAgo  = (d) => {
          const m = Math.floor((Date.now() - new Date(d)) / 60000)
          if (m < 1)  return 'now'
          if (m < 60) return `${m}m`
          return `${Math.floor(m/60)}h`
        }
        return (
          <div key={i} onClick={() => navigate(`/chat/${otherUID}`)}
            style={{ display:'flex', gap:'0.85rem', padding:'0.85rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--surface)'}
          >
            <div style={{ width:42, height:42, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>
              {initials}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.2rem' }}>
                <div style={{ fontWeight:600, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text3)', flexShrink:0, marginLeft:'0.5rem' }}>{timeAgo(lastMsg?.createdAt)}</div>
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {lastMsg?.text || '…'}
              </div>
            </div>
            {c.unread > 0 && (
              <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:'0.65rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'center' }}>
                {c.unread}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Notifications tab ──────────────────────────────────────── */
function NotificationsTab() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotif, clearAll, TYPE_ICONS, loading } = useNotifications()
  const navigate  = useNavigate()
  const TYPE_COLOR = {
    booking_approved:'#22c55e', booking_rejected:'#ef4444', booking_cancelled:'#ef4444',
    payment_success:'#22c55e', payment_received:'#22c55e', new_message:'#3b82f6',
    new_review:'#f5a623', welcome:'#e94560', property_approved:'#22c55e',
    property_rejected:'#ef4444', booking_request:'#0f3460', price_alert:'#f5a623',
  }
  async function click(n) {
    if (!n.read) await markRead(n._id)
    if (n.link) navigate(n.link)
  }
  const ago = d => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m/60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div style={{ fontSize:'0.84rem', color:'var(--text2)' }}>
          {unreadCount > 0 ? <><strong style={{ color:'var(--accent)' }}>{unreadCount} unread</strong> · {notifications.length} total</> : `${notifications.length} notifications`}
        </div>
        <div style={{ display:'flex', gap:'0.4rem' }}>
          {unreadCount > 0 && <button className="btn btn-outline btn-sm" onClick={markAllRead}>✓ Mark all read</button>}
          {notifications.length > 0 && <button className="btn btn-outline btn-sm" style={{ color:'var(--danger)', borderColor:'var(--danger)' }} onClick={clearAll}>Clear all</button>}
        </div>
      </div>
      {loading && <div className="spinner-wrap"><div className="spinner"/></div>}
      {!loading && notifications.length === 0 && <div className="empty"><div className="empty-icon">🔔</div><p>No notifications yet.</p></div>}
      {notifications.map(n => (
        <div key={n._id} className={`notif-page-item ${!n.read?'unread':''}`} onClick={() => click(n)}>
          {!n.read && <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--accent)',flexShrink:0,alignSelf:'center',marginRight:2 }}/>}
          <div className="notif-icon-wrap" style={{ background:(TYPE_COLOR[n.type]||'#888')+'18', border:`1.5px solid ${(TYPE_COLOR[n.type]||'#888')}30` }}>
            {TYPE_ICONS[n.type]||'🔔'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="notif-title" style={{ fontWeight:n.read?500:700 }}>{n.title}</div>
            <div className="notif-msg">{n.message}</div>
            <div className="notif-time">{ago(n.createdAt)}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();deleteNotif(n._id)}}
            style={{ background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'1rem',padding:'0.2rem',flexShrink:0,alignSelf:'flex-start' }}>×</button>
        </div>
      ))}
    </div>
  )
}

/* ── Agreements tab ─────────────────────────────────────────── */
function AgreementsTab({ bookings }) {
  const [agreements,  setAgreements]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    axios.get('/api/agreement/list')
      .then(r => setAgreements(r.data.agreements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function download(agreementId, filename) {
    setDownloading(agreementId)
    try {
      const res = await axios.get(`/api/agreement/download/${agreementId}`, { responseType:'blob' })
      downloadBlob(res.data, filename || `StayFinder_Agreement_${agreementId}.pdf`)
      toast.success('📄 Downloaded!')
    } catch { toast.error('Download failed') }
    finally { setDownloading(null) }
  }

  async function generateForBooking(bookingId) {
    setDownloading(bookingId)
    try {
      const res = await axios.post(`/api/agreement/generate/${bookingId}`, {}, { responseType:'blob' })
      downloadBlob(res.data, `StayFinder_Agreement.pdf`)
      toast.success('📄 Agreement generated & downloaded!')
      // refresh list
      const r = await axios.get('/api/agreement/list')
      setAgreements(r.data.agreements || [])
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to generate')
    }
    finally { setDownloading(null) }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>

  // Find paid bookings without agreements
  const agreementBookingIds = new Set(agreements.map(a => a.booking?._id?.toString()))
  const paidWithoutAgreement = (bookings || []).filter(b =>
    b.paymentStatus === 'paid' && !agreementBookingIds.has(b._id?.toString())
  )

  return (
    <div>
      {paidWithoutAgreement.length > 0 && (
        <div className="alert alert-info" style={{ marginBottom:'1rem' }}>
          💡 {paidWithoutAgreement.length} paid booking(s) without an agreement.
          Click "Generate" to create them.
        </div>
      )}

      {agreements.length === 0 && paidWithoutAgreement.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📄</div>
          <p>No rental agreements yet.</p>
          <p style={{ fontSize:'0.82rem', color:'var(--text2)', marginTop:'0.4rem' }}>
            Agreements are auto-generated after payment is confirmed.
          </p>
        </div>
      )}

      {/* Existing agreements */}
      {agreements.map(a => (
        <div key={a._id} className="review-card" style={{ marginBottom:'0.75rem' }}>
          <div className="review-head">
            <div>
              <div className="reviewer">📄 {a.property?.title}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>
                ID: {a.agreementId} · {new Date(a.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap' }}>
              <span className="status-badge status-active">✓ Generated</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => download(a.agreementId, `StayFinder_Agreement_${a.agreementId}.pdf`)}
                disabled={downloading === a.agreementId}
              >
                {downloading === a.agreementId ? '⏳' : '⬇️ Download PDF'}
              </button>
            </div>
          </div>
          {a.booking && (
            <div className="review-text" style={{ marginTop:'0.35rem' }}>
              📅 {new Date(a.booking.startDate).toLocaleDateString('en-IN')} ·
              {a.booking.duration} month(s) · ₹{a.booking.totalAmount?.toLocaleString()}
            </div>
          )}
        </div>
      ))}

      {/* Generate buttons for paid bookings without agreement */}
      {paidWithoutAgreement.map(b => (
        <div key={b._id} className="review-card" style={{ marginBottom:'0.75rem', border:'1px dashed var(--border)' }}>
          <div className="review-head">
            <div>
              <div className="reviewer">📄 {b.property?.title}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>
                Paid · {new Date(b.startDate).toLocaleDateString('en-IN')}
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => generateForBooking(b._id)}
              disabled={downloading === b._id}
            >
              {downloading === b._id ? '⏳ Generating…' : '📄 Generate Agreement'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Dashboard main ─────────────────────────────────────────── */
const TENANT_TABS = ['Bookings','Notifications','Agreements','Price Compare','Messages']
const OWNER_TABS  = ['Bookings','Notifications','Agreements','My Listings','Price Compare','Messages']

export default function Dashboard() {
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const { unreadCount } = useNotifications()
  const [bookings,  setBookings] = useState([])
  const [listings,  setListings] = useState([])
  const [loading,   setLoading]  = useState(true)
  const [tab,       setTab]      = useState('Bookings')
  const isOwner = user?.role === 'owner'

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    const fetches = isOwner
      ? Promise.all([ownerBookings(), myListings()])
      : Promise.all([myBookings(), Promise.resolve({ data:{ properties:[] } })])
    fetches.then(([bRes, lRes]) => {
      setBookings(bRes.data.bookings || [])
      setListings(lRes.data.properties || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  async function changeStatus(id, status) {
    try {
      await updateBookingStatus(id, status)
      setBookings(prev => prev.map(b => b._id===id ? {...b, status} : b))
      toast.success(`Booking ${status}`)
    } catch { toast.error('Failed to update') }
  }

  const savedCount   = user?.wishlist?.length || 0
  const activeCount  = bookings.filter(b => b.status==='approved').length
  const pendingCount = bookings.filter(b => b.status==='pending').length
  const savings      = bookings.reduce((s,b) => {
    const diff = (b.property?.price||0) - (b.property?.aiPredictedPrice||b.property?.price||0)
    return s + (diff>0 ? diff*(b.duration||1) : 0)
  }, 0)

  if (loading) return <div className="spinner-wrap" style={{ paddingTop:'6rem' }}><div className="spinner"/></div>

  const tabs = isOwner ? OWNER_TABS : TENANT_TABS

  return (
    <div className="container page-wrap">
      <div className="section-title">My <span>Dashboard</span></div>

      {/* Metric cards */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Active Bookings</div><div className="metric-value">{activeCount}</div><div className="metric-sub">{pendingCount} pending</div></div>
        <div className="metric-card"><div className="metric-label">Wishlisted</div><div className="metric-value">{savedCount}</div><div className="metric-sub">Saved rooms</div></div>
        {isOwner
          ? <div className="metric-card"><div className="metric-label">My Listings</div><div className="metric-value">{listings.length}</div><div className="metric-sub">Properties</div></div>
          : <div className="metric-card"><div className="metric-label">AI Savings</div><div className="metric-value">₹{savings.toLocaleString()}</div><div className="metric-sub">vs overpriced</div></div>}
        <div className="metric-card" style={{ cursor:'pointer' }} onClick={() => setTab('Notifications')}>
          <div className="metric-label">Notifications</div>
          <div className="metric-value" style={{ color: unreadCount>0?'var(--accent)':'var(--primary)' }}>{unreadCount}</div>
          <div className="metric-sub">{unreadCount>0?'unread':'all read'}</div>
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div style={{ display:'flex', gap:'0.35rem', marginBottom:'1.25rem', borderBottom:'1px solid var(--border)', paddingBottom:'0.6rem', overflowX:'auto' }}>
        {tabs.map(t => (
          <button key={t} className={`chip ${tab===t?'active':''}`} onClick={() => setTab(t)}
            style={{ whiteSpace:'nowrap', flexShrink:0, position:'relative' }}>
            {t}
            {t==='Notifications' && unreadCount>0 && (
              <span style={{ marginLeft:'0.35rem', background:'var(--accent)', color:'#fff', borderRadius:20, padding:'0 0.35rem', fontSize:'0.62rem', fontWeight:700, verticalAlign:'middle' }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Bookings ─────────────────────────────────── */}
      {tab==='Bookings' && (
        bookings.length===0
          ? <div className="empty"><div className="empty-icon">📋</div><p>No bookings yet. <span style={{ color:'var(--accent)',cursor:'pointer' }} onClick={()=>navigate('/search')}>Browse rooms →</span></p></div>
          : bookings.map(b => (
            <div key={b._id} className="review-card" style={{ marginBottom:'0.75rem' }}>
              <div className="review-head" style={{ flexWrap:'wrap', gap:'0.4rem' }}>
                <div className="reviewer">{isOwner ? b.user?.name : b.property?.title}</div>
                <div style={{ display:'flex', gap:'0.35rem', alignItems:'center', flexWrap:'wrap' }}>
                  <span className={`status-badge status-${b.status}`}>{b.status}</span>
                  {b.paymentStatus==='paid' && <span className="status-badge status-active">💰 Paid</span>}
                </div>
              </div>
              <div className="review-text" style={{ marginBottom:'0.5rem' }}>
                📍 {b.property?.location?.city} · 📅 {new Date(b.startDate).toLocaleDateString('en-IN')} · {b.duration}mo · ₹{b.totalAmount?.toLocaleString()}
              </div>
              <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                {isOwner && b.status==='pending' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={()=>changeStatus(b._id,'approved')}>✅ Approve</button>
                    <button className="btn btn-outline btn-sm" onClick={()=>changeStatus(b._id,'rejected')}>❌ Reject</button>
                  </>
                )}
                {!isOwner && b.status==='approved' && b.paymentStatus!=='paid' && (
                  <button className="btn btn-primary btn-sm" onClick={()=>navigate(`/payment/${b._id}`)}>💳 Pay Now</button>
                )}
                {!isOwner && b.status==='pending' && (
                  <button className="btn btn-outline btn-sm" onClick={()=>changeStatus(b._id,'cancelled')}>Cancel</button>
                )}
                {b.paymentStatus==='paid' && (
                  <button className="btn btn-outline btn-sm" onClick={()=>setTab('Agreements')}>📄 Agreement</button>
                )}
              </div>
            </div>
          ))
      )}

      {/* ── Notifications ─────────────────────────────── */}
      {tab==='Notifications' && <NotificationsTab />}

      {/* ── Agreements ────────────────────────────────── */}
      {tab==='Agreements' && <AgreementsTab bookings={bookings}/>}

      {/* ── My Listings (owner) ───────────────────────── */}
      {tab==='My Listings' && isOwner && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.85rem' }}>
            <button className="btn btn-primary btn-sm" onClick={()=>navigate('/add-property')}>+ Add Property</button>
          </div>
          {listings.length===0
            ? <div className="empty"><div className="empty-icon">🏠</div><p>No listings yet.</p></div>
            : listings.map(p => (
              <div key={p._id} className="review-card" style={{ marginBottom:'0.65rem' }}>
                <div className="review-head">
                  <div className="reviewer">{p.title}</div>
                  <span className={`status-badge ${p.isAvailable?'status-active':'status-cancelled'}`}>{p.isAvailable?'Active':'Inactive'}</span>
                </div>
                <div className="review-text">📍 {p.location?.city} · ₹{p.price?.toLocaleString()}/mo · {p.availableRooms} available · ★{p.rating?.toFixed(1)}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Price Compare ──────────────────────────────── */}
      {tab==='Price Compare' && (
        <div className="card">
          <p style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'1rem' }}>Listed vs AI fair price for your bookings</p>
          <CompareChart bookings={bookings}/>
        </div>
      )}

      {/* ── Messages ──────────────────────────────────── */}
      {tab==='Messages' && <ChatWidget />}
    </div>
  )
}
