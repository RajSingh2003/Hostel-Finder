import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PropertyCard from '../components/PropertyCard'
import AIPricePredictor from '../components/AIPricePredictor'
import { getProperties } from '../utils/api'

const STATS = [
  { num:'2,400+', label:'Verified Listings' },
  { num:'18',     label:'Cities Covered' },
  { num:'94%',    label:'AI Accuracy' },
  { num:'12k+',   label:'Happy Tenants' },
]

const HOW = [
  { icon:'🔍', title:'Search Rooms',       text:'Filter by city, type, budget & amenities.' },
  { icon:'🤖', title:'AI Analyses Price',  text:'Our ML model flags overpriced listings instantly.' },
  { icon:'📋', title:'Book Instantly',     text:'Send a request. Owner responds within 24 hours.' },
  { icon:'🏠', title:'Move In',            text:'Pay deposit and move into your new home.' },
]

export default function Home() {
  const navigate = useNavigate()
  const [search,   setSearch]   = useState('')
  const [type,     setType]     = useState('')
  const [featured, setFeatured] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getProperties({ limit:6, sort:'rating' })
      .then(r => setFeatured(r.data.properties))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSearch() {
    const p = new URLSearchParams()
    if (search) p.set('city', search)
    if (type)   p.set('type', type)
    navigate(`/search?${p}`)
  }

  return (
    <>
      {/* ── Hero ────────────────────────────────── */}
      <div className="hero">
        <h1>Find Your Perfect Room<br/>with <span style={{ color:'var(--gold)' }}>AI Pricing</span></h1>
        <p>Smart recommendations · Fair price detection · 2,400+ verified listings</p>
        <div className="search-box">
          <input
            placeholder="🔍  City or locality..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleSearch()}
          />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="">Any type</option>
            {['PG','Hostel','Studio','1BHK','2BHK','Shared Room'].map(t=><option key={t}>{t}</option>)}
          </select>
          <button className="btn-search" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────── */}
      <div className="stats-bar">
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign:'center' }}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="container" style={{ paddingTop:'2rem', paddingBottom:'5.5rem' }}>

        {/* ── AI Predictor ─────────────────────── */}
        <div className="section-gap">
          <div className="section-title">🤖 AI <span>Price Predictor</span></div>
          <AIPricePredictor />
        </div>

        {/* ── Featured ─────────────────────────── */}
        <div className="section-gap">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
            <div className="section-title" style={{ margin:0 }}>🏠 Featured <span>Listings</span></div>
            <button className="btn btn-outline btn-sm" onClick={()=>navigate('/search')}>View all →</button>
          </div>
          {loading ? (
            <div className="spinner-wrap"><div className="spinner"/></div>
          ) : featured.length ? (
            <div className="cards-grid">
              {featured.map(p => <PropertyCard key={p._id} property={p}/>)}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">🏠</div>
              <p>No listings yet.{' '}
                <span style={{ color:'var(--accent)', cursor:'pointer' }} onClick={()=>navigate('/add-property')}>
                  Add the first one!
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ── How it Works ─────────────────────── */}
        <div className="section-gap">
          <div className="section-title">⚙️ How <span>It Works</span></div>
          <div className="how-grid">
            {HOW.map((s,i) => (
              <div key={s.title} className="card" style={{ textAlign:'center', padding:'1.35rem 1rem', position:'relative' }}>
                <div style={{ position:'absolute', top:10, right:12, fontSize:'0.65rem', fontWeight:700, color:'var(--text3)', fontFamily:'DM Sans,sans-serif' }}>STEP {i+1}</div>
                <div style={{ fontSize:'1.9rem', marginBottom:'0.6rem' }}>{s.icon}</div>
                <div style={{ fontWeight:600, fontSize:'0.9rem', marginBottom:'0.35rem' }}>{s.title}</div>
                <div style={{ fontSize:'0.8rem', color:'var(--text2)', lineHeight:1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature promo strip ─────────────────── */}
        <div className="section-gap">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
            {[
              {
                icon:'🧑‍🤝‍🧑', title:'Roommate Finder',
                desc:'Match with compatible roommates based on budget, habits and lifestyle.',
                link:'/roommates', cta:'Find Roommates →', bg:'#f0f4ff',
              },
              {
                icon:'📉', title:'Smart Price Alerts',
                desc:'Get notified instantly when a price drops or a new room matches your budget.',
                link:'/roommates', cta:'Set Alert →', bg:'#fff9ec',
              },
              {
                icon:'📄', title:'Digital Agreements',
                desc:'Auto-generated PDF rental agreement after every payment — legally valid.',
                link:'/dashboard', cta:'View Agreements →', bg:'#f0fdf4',
              },
            ].map(f => (
              <div key={f.title} style={{ background:f.bg, border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <div style={{ fontSize:'1.8rem' }}>{f.icon}</div>
                <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{f.title}</div>
                <div style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.5, flex:1 }}>{f.desc}</div>
                <button className="btn btn-outline btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => navigate(f.link)}>{f.cta}</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust strip ──────────────────────── */}
        <div className="section-gap">
          <div style={{ background:'var(--primary)', borderRadius:'var(--radius)', padding:'1.75rem 1.5rem', display:'flex', flexWrap:'wrap', gap:'1.25rem', justifyContent:'space-around', alignItems:'center' }}>
            {[
              { icon:'🔒', label:'Verified Listings' },
              { icon:'🤖', label:'AI Price Guard' },
              { icon:'💬', label:'Real-time Chat' },
              { icon:'💳', label:'Secure Payments' },
              { icon:'📧', label:'Instant Alerts' },
            ].map(t => (
              <div key={t.label} style={{ textAlign:'center', color:'#fff' }}>
                <div style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>{t.icon}</div>
                <div style={{ fontSize:'0.72rem', opacity:.72, fontWeight:500 }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

// Note: The Home component above already has HOW section.
// The Roommate Finder and Smart Alerts are accessible via /roommates route.
