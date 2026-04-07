import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import PropertyCard from '../components/PropertyCard'
import { getProperties } from '../utils/api'

const TYPES     = ['PG','Hostel','Studio','1BHK','2BHK','Shared Room']
const GENDERS   = ['Male','Female','Any']
const AMENITIES = ['WiFi','AC','Meals Included','Gym','Laundry','Parking']
const CITIES    = ['Mumbai','Delhi','Pune','Bengaluru','Hyderabad','Chennai','Nashik','Nagpur']

export default function Search() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const [properties, setProperties] = useState([])
  const [total,    setTotal]   = useState(0)
  const [loading,  setLoading] = useState(true)
  const [page,     setPage]    = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    city:      params.get('city') || '',
    type:      params.get('type') || '',
    gender:    '',
    maxPrice:  30000,
    amenities: [],
    sort:      'rating',
  })

  const doFetch = useCallback(async () => {
    setLoading(true)
    try {
      const q = { ...filters, page, limit:12 }
      if (q.amenities?.length) q.amenities = q.amenities.join(',')
      const { data } = await getProperties(q)
      setProperties(data.properties)
      setTotal(data.pagination.total)
    } catch { setProperties([]) }
    finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => { doFetch() }, [doFetch])

  function set(k, v) { setFilters(f => ({...f, [k]:v})); setPage(1) }
  function toggleAmenity(a) {
    setFilters(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities,a] }))
    setPage(1)
  }
  function toggleType(t) { set('type', filters.type===t ? '' : t) }

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="container" style={{ paddingTop:'calc(var(--nav-h) + 1rem)', paddingBottom:'5.5rem' }}>

      {/* ── Header row ─────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.85rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div className="section-title" style={{ margin:0 }}>
          Browse <span>Listings</span>
          {!loading && <span style={{ fontSize:'0.82rem', fontFamily:'DM Sans,sans-serif', fontWeight:400, color:'var(--text2)', marginLeft:'0.5rem' }}>({total})</span>}
        </div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <select className="form-control" style={{ width:'auto', padding:'0.38rem 0.65rem', fontSize:'0.8rem' }}
            value={filters.sort} onChange={e => set('sort', e.target.value)}>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="newest">Newest</option>
            <option value="ai-fair">AI Fair Deal</option>
          </select>
          {/* Mobile filter toggle */}
          <button className="btn btn-outline btn-sm filter-toggle-btn" onClick={()=>setShowFilters(f=>!f)}>
            {showFilters ? '✕ Filters' : '⚙ Filters'}
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────── */}
      <div className={`filters-bar search-filters ${showFilters ? 'filters-open' : ''}`}>
        {/* City */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexWrap:'wrap' }}>
          <span className="filter-label">City:</span>
          <select className="form-control" style={{ width:'auto', padding:'0.3rem 0.55rem', fontSize:'0.78rem' }}
            value={filters.city} onChange={e => set('city', e.target.value)}>
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="filter-sep"/>

        {/* Type chips */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', flexWrap:'wrap' }}>
          <span className="filter-label">Type:</span>
          {TYPES.map(t => (
            <span key={t} className={`chip ${filters.type===t?'active':''}`} onClick={()=>toggleType(t)}>{t}</span>
          ))}
        </div>

        <div className="filter-sep"/>

        {/* Gender */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', flexWrap:'wrap' }}>
          <span className="filter-label">For:</span>
          {GENDERS.map(g => (
            <span key={g} className={`chip ${filters.gender===g?'active':''}`} onClick={()=>set('gender', filters.gender===g?'':g)}>{g}</span>
          ))}
        </div>

        <div className="filter-sep"/>

        {/* Price slider */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
          <span className="filter-label">Max ₹:</span>
          <input type="range" min={2000} max={30000} step={500} value={filters.maxPrice}
            onChange={e => set('maxPrice', e.target.value)} style={{ width:100 }}/>
          <span style={{ fontSize:'0.78rem', color:'var(--text2)', minWidth:60, fontWeight:500 }}>
            ₹{Number(filters.maxPrice).toLocaleString()}
          </span>
        </div>

        <div className="filter-sep"/>

        {/* Amenities */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', flexWrap:'wrap' }}>
          <span className="filter-label">Has:</span>
          {AMENITIES.map(a => (
            <span key={a} className={`chip ${filters.amenities.includes(a)?'active':''}`} onClick={()=>toggleAmenity(a)}>{a}</span>
          ))}
        </div>
      </div>

      {/* ── Active filter chips ─────────────────── */}
      {(filters.type || filters.gender || filters.amenities.length > 0 || filters.city) && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginBottom:'0.75rem' }}>
          {filters.city && <span className="chip active" style={{ cursor:'default', fontSize:'0.72rem' }}>📍 {filters.city} <span style={{ marginLeft:4, cursor:'pointer' }} onClick={()=>set('city','')}>×</span></span>}
          {filters.type && <span className="chip active" style={{ cursor:'default', fontSize:'0.72rem' }}>🏠 {filters.type} <span style={{ marginLeft:4, cursor:'pointer' }} onClick={()=>set('type','')}>×</span></span>}
          {filters.gender && <span className="chip active" style={{ cursor:'default', fontSize:'0.72rem' }}>👥 {filters.gender} <span style={{ marginLeft:4, cursor:'pointer' }} onClick={()=>set('gender','')}>×</span></span>}
          {filters.amenities.map(a => <span key={a} className="chip active" style={{ cursor:'default', fontSize:'0.72rem' }}>{a} <span style={{ marginLeft:4, cursor:'pointer' }} onClick={()=>toggleAmenity(a)}>×</span></span>)}
          <span className="chip" style={{ fontSize:'0.72rem', color:'var(--danger)', borderColor:'var(--danger)' }}
            onClick={() => { setFilters(f=>({...f,city:'',type:'',gender:'',amenities:[]})); setPage(1) }}>
            Clear all
          </span>
        </div>
      )}

      {/* ── Results ─────────────────────────────── */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner"/></div>
      ) : properties.length ? (
        <>
          <div className="cards-grid">
            {properties.map(p => <PropertyCard key={p._id} property={p}/>)}
          </div>
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem', marginTop:'1.5rem', flexWrap:'wrap' }}>
              <button className="btn btn-outline btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              {Array.from({length:Math.min(totalPages,5)},(_,i)=>{
                const pg = page <= 3 ? i+1 : page - 2 + i
                if (pg > totalPages) return null
                return <button key={pg} className={`btn btn-sm ${pg===page?'btn-primary':'btn-outline'}`} onClick={()=>setPage(pg)}>{pg}</button>
              })}
              <button className="btn btn-outline btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>No listings match your filters.</p>
          <button className="btn btn-outline btn-sm" style={{ marginTop:'0.75rem' }}
            onClick={()=>{ setFilters(f=>({...f,city:'',type:'',gender:'',amenities:[]})); setPage(1) }}>
            Clear filters
          </button>
        </div>
      )}

      <style>{`
        .filter-toggle-btn { display:none; }
        .search-filters { display:flex; }
        @media(max-width:768px){
          .filter-toggle-btn { display:flex; }
          .search-filters { display:none; flex-direction:column; align-items:flex-start; }
          .search-filters.filters-open { display:flex; }
          .filter-sep { display:none; }
        }
      `}</style>
    </div>
  )
}
