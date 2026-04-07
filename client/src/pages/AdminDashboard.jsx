import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const TABS = ['Overview','Users','Properties','Bookings','Reviews']

export default function AdminDashboard() {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [tab,        setTab]     = useState('Overview')
  const [stats,      setStats]   = useState(null)
  const [users,      setUsers]   = useState([])
  const [properties, setProps]   = useState([])
  const [bookings,   setBookings]= useState([])
  const [reviews,    setReviews] = useState([])
  const [loading,    setLoading] = useState(true)
  const [search,     setSearch]  = useState('')

  useEffect(() => {
    if (!user)                  { navigate('/auth'); return }
    if (user.role !== 'admin')  { toast.error('Admin access required'); navigate('/'); return }
    fetchAll()
  }, [user])

  async function fetchAll() {
    setLoading(true)
    try {
      const [sR,uR,pR,bR,rR] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/properties'),
        axios.get('/api/admin/bookings'),
        axios.get('/api/admin/reviews'),
      ])
      setStats(sR.data.stats)
      setUsers(uR.data.users)
      setProps(pR.data.properties)
      setBookings(bR.data.bookings)
      setReviews(rR.data.reviews)
    } catch { toast.error('Failed to load admin data') }
    finally { setLoading(false) }
  }

  async function approveProperty(id, approved) {
    await axios.put(`/api/admin/properties/${id}/approve`, { approved })
    setProps(prev => prev.map(p => p._id===id ? {...p,isApproved:approved} : p))
    toast.success(approved ? '✅ Property approved' : 'Property suspended')
  }
  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return
    await axios.delete(`/api/admin/users/${id}`)
    setUsers(prev => prev.filter(u=>u._id!==id))
    toast.success('User deleted')
  }
  async function deleteProperty(id) {
    if (!confirm('Delete this property?')) return
    await axios.delete(`/api/admin/properties/${id}`)
    setProps(prev => prev.filter(p=>p._id!==id))
    toast.success('Property deleted')
  }
  async function deleteReview(id) {
    await axios.delete(`/api/admin/reviews/${id}`)
    setReviews(prev => prev.filter(r=>r._id!==id))
    toast.success('Review deleted')
  }
  async function changeRole(id, role) {
    await axios.put(`/api/admin/users/${id}/role`, { role })
    setUsers(prev => prev.map(u=>u._id===id?{...u,role}:u))
    toast.success('Role updated')
  }

  if (loading) return <div className="spinner-wrap" style={{ paddingTop:'6rem' }}><div className="spinner"/></div>

  const fu = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  const fp = properties.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()) || p.location?.city?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="container" style={{ paddingTop:'calc(var(--nav-h)+1.25rem)', paddingBottom:'5.5rem' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <div className="section-title" style={{ margin:0 }}>🛡️ Admin <span>Dashboard</span></div>
        <input className="form-control" style={{ width:'auto', minWidth:180, maxWidth:'100%' }}
          placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div style={{ display:'flex', gap:'0.35rem', marginBottom:'1.25rem', overflowX:'auto', paddingBottom:'0.25rem' }}>
        {TABS.map(t => <button key={t} className={`chip ${tab===t?'active':''}`} onClick={()=>setTab(t)} style={{ whiteSpace:'nowrap', flexShrink:0 }}>{t}</button>)}
      </div>

      {/* Overview */}
      {tab==='Overview' && stats && (
        <>
          <div className="metrics-grid">
            {[
              { label:'Total Users',     value:stats.users,     sub:`${stats.tenants} tenants · ${stats.owners} owners` },
              { label:'Live Properties', value:stats.properties,sub:`${stats.pendingProps || 0} pending review` },
              { label:'Total Bookings',  value:stats.bookings,  sub:'All time' },
              { label:'Revenue',         value:`₹${(stats.revenue||0).toLocaleString()}`, sub:'Via payments' },
            ].map(m=>(
              <div key={m.label} className="metric-card">
                <div className="metric-label">{m.label}</div>
                <div className="metric-value" style={{ fontSize:'1.4rem' }}>{m.value}</div>
                <div className="metric-sub">{m.sub}</div>
              </div>
            ))}
          </div>
          {(stats.pendingProps||0) > 0 && (
            <div className="alert alert-warning" style={{ marginTop:'0.75rem' }}>
              ⚠️ {stats.pendingProps} properties pending approval.{' '}
              <span style={{ cursor:'pointer', textDecoration:'underline', fontWeight:600 }} onClick={()=>setTab('Properties')}>Review now →</span>
            </div>
          )}
          <div style={{ marginTop:'1.5rem' }}>
            <div className="section-title" style={{ fontSize:'1rem' }}>Recent Bookings</div>
            {bookings.slice(0,5).map(b=>(
              <div key={b._id} className="review-card" style={{ marginBottom:'0.6rem' }}>
                <div className="review-head">
                  <span className="reviewer" style={{ fontSize:'0.82rem' }}>{b.user?.name} → {b.property?.title}</span>
                  <span className={`status-badge status-${b.status}`}>{b.status}</span>
                </div>
                <div className="review-text">📍 {b.property?.location?.city} · ₹{b.totalAmount?.toLocaleString()} · {new Date(b.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Users */}
      {tab==='Users' && (
        <div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'0.85rem' }}>{fu.length} users</div>
          {fu.map(u=>(
            <div key={u._id} className="review-card" style={{ marginBottom:'0.6rem' }}>
              <div className="review-head" style={{ flexWrap:'wrap', gap:'0.4rem' }}>
                <div>
                  <div className="reviewer">{u.name}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text2)' }}>{u.email}</div>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap' }}>
                  <select className="form-control" style={{ width:'auto', padding:'0.22rem 0.45rem', fontSize:'0.73rem' }}
                    value={u.role} onChange={e=>changeRole(u._id,e.target.value)}>
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn btn-outline btn-sm" style={{ color:'var(--danger)', borderColor:'var(--danger)' }} onClick={()=>deleteUser(u._id)}>Delete</button>
                </div>
              </div>
              <div className="review-text">Joined {new Date(u.createdAt).toLocaleDateString()} · Wishlist: {u.wishlist?.length||0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Properties */}
      {tab==='Properties' && (
        <div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'0.85rem' }}>{fp.length} properties</div>
          {fp.map(p=>(
            <div key={p._id} className="review-card" style={{ marginBottom:'0.6rem' }}>
              <div className="review-head" style={{ flexWrap:'wrap', gap:'0.4rem' }}>
                <div>
                  <div className="reviewer">{p.title}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text2)' }}>by {p.owner?.name} · {p.location?.city} · ₹{p.price?.toLocaleString()}/mo</div>
                </div>
                <div style={{ display:'flex', gap:'0.35rem', alignItems:'center', flexWrap:'wrap' }}>
                  <span className={`status-badge ${p.isApproved?'status-active':'status-pending'}`}>{p.isApproved?'Live':'Pending'}</span>
                  {!p.isApproved
                    ? <button className="btn btn-primary btn-sm" onClick={()=>approveProperty(p._id,true)}>✅ Approve</button>
                    : <button className="btn btn-outline btn-sm" onClick={()=>approveProperty(p._id,false)}>Suspend</button>}
                  <button className="btn btn-outline btn-sm" style={{ color:'var(--danger)', borderColor:'var(--danger)' }} onClick={()=>deleteProperty(p._id)}>Delete</button>
                </div>
              </div>
              <div className="review-text">{p.type} · {p.size} sqft · ★{p.rating?.toFixed(1)||0} ({p.reviewCount||0} reviews)</div>
            </div>
          ))}
        </div>
      )}

      {/* Bookings */}
      {tab==='Bookings' && (
        <div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'0.85rem' }}>{bookings.length} bookings</div>
          {bookings.map(b=>(
            <div key={b._id} className="review-card" style={{ marginBottom:'0.6rem' }}>
              <div className="review-head" style={{ flexWrap:'wrap', gap:'0.35rem' }}>
                <span className="reviewer" style={{ fontSize:'0.82rem' }}>{b.user?.name} → {b.property?.title}</span>
                <div style={{ display:'flex', gap:'0.35rem' }}>
                  <span className={`status-badge status-${b.status}`}>{b.status}</span>
                  <span className={`status-badge ${b.paymentStatus==='paid'?'status-active':'status-pending'}`}>{b.paymentStatus}</span>
                </div>
              </div>
              <div className="review-text">📍 {b.property?.location?.city} · 📅 {new Date(b.startDate).toLocaleDateString()} · {b.duration}mo · ₹{b.totalAmount?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews */}
      {tab==='Reviews' && (
        <div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'0.85rem' }}>{reviews.length} reviews</div>
          {reviews.map(r=>(
            <div key={r._id} className="review-card" style={{ marginBottom:'0.6rem' }}>
              <div className="review-head">
                <div>
                  <span className="reviewer">{r.user?.name}</span>
                  <span style={{ fontSize:'0.73rem', color:'var(--text2)', marginLeft:'0.4rem' }}>on {r.property?.title}</span>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
                  <span className="stars" style={{ fontSize:'0.85rem' }}>{'★'.repeat(r.rating)}</span>
                  <button className="btn btn-outline btn-sm" style={{ color:'var(--danger)', borderColor:'var(--danger)' }} onClick={()=>deleteReview(r._id)}>Delete</button>
                </div>
              </div>
              <div className="review-text">{r.comment}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
