import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addProperty, predictPrice } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const ALL_AMENITIES = ['WiFi','AC','Attached Bath','Meals Included','Gym','Laundry','Parking','CCTV','Lift','Hot Water','Furnished','Power Backup']
const CITIES  = ['Mumbai','Delhi','Pune','Bengaluru','Hyderabad','Chennai','Nashik','Nagpur','Ahmedabad','Kolkata']
const TYPES   = ['PG','Hostel','Studio','1BHK','2BHK','Shared Room']
const FLOORS  = ['Ground','1st','2nd','3rd','4th+']
const STEPS   = ['Basic Info','Location & Pricing','Amenities & Photos']

export default function AddProperty() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step,      setStep]     = useState(0)
  const [loading,   setLoading]  = useState(false)
  const [aiAlert,   setAiAlert]  = useState(null)
  const [amenities, setAmenities]= useState([])
  const [images,    setImages]   = useState([])

  const [form, setForm] = useState({
    title:'', description:'', type:'PG', gender:'Any',
    city:'Pune', address:'', pincode:'',
    price:'', size:'', floor:'Ground',
    totalRooms:1, availableRooms:1, securityDeposit:''
  })

  if (!user) { navigate('/auth'); return null }
  if (user.role !== 'owner' && user.role !== 'admin') {
    return (
     <div 
  className="container" 
  style={{ 
    paddingTop: '5.5rem',
    paddingBottom: '5.5rem',
    overflow: 'visible'
  }}
>
        <div className="empty">
          <div className="empty-icon">🏢</div>
          <p style={{ fontWeight:600, marginBottom:'0.5rem' }}>Owner Account Required</p>
          <p style={{ fontSize:'0.85rem' }}>Register as an owner to list properties.</p>
          <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={()=>navigate('/auth')}>Register as Owner</button>
        </div>
      </div>
    )
  }

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function toggleAmenity(a) { setAmenities(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev,a]) }

  async function checkFairPrice(price) {
    if (!price || !form.size) return
    try {
      const { data } = await predictPrice({ city:form.city, type:form.type, size:Number(form.size), floor:form.floor, amenities })
      const predicted = data.data.predicted
      const diff = ((Number(price) - predicted) / predicted * 100)
      if (diff > 20)       setAiAlert({ type:'warning', msg:`⚠️ Your rent ₹${Number(price).toLocaleString()} is ${diff.toFixed(0)}% above AI fair price ₹${predicted.toLocaleString()}. Consider reducing to attract tenants.` })
      else if (diff < -10) setAiAlert({ type:'success', msg:`💡 Your rent is ${Math.abs(diff).toFixed(0)}% below market avg ₹${predicted.toLocaleString()}. You could earn more!` })
      else                 setAiAlert({ type:'info', msg:`✅ Fair price! AI predicted range: ₹${data.data.range.low.toLocaleString()} – ₹${data.data.range.high.toLocaleString()}/mo` })
    } catch {}
  }

  function validateStep() {
    if (step === 0 && (!form.title || !form.description)) { toast.error('Title and description required'); return false }
    if (step === 1 && (!form.address || !form.price || !form.size)) { toast.error('Address, price and size required'); return false }
    return true
  }

  async function handleSubmit() {
    if (!form.title || !form.price || !form.address || !form.size || !form.description) {
      toast.error('Please fill all required fields'); return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k, v))
      fd.append('amenities', JSON.stringify(amenities))
      fd.append('location',  JSON.stringify({ address:form.address, city:form.city, pincode:form.pincode }))
      images.forEach(img => fd.append('images', img))
      await addProperty(fd)
      toast.success('🎉 Property submitted! Pending admin review.')
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submission failed')
    } finally { setLoading(false) }
  }

  return (
   <div 
  className="container" 
  style={{ 
    paddingTop: '5.5rem',
    paddingBottom: '5.5rem',
    overflow: 'visible'
  }}
>
      <div className="section-title">List Your <span>Property</span></div>

      {/* Step indicator */}
      <div style={{ display:'flex', gap:'0', marginBottom:'1.5rem', overflowX:'auto' }}>
        {STEPS.map((s,i) => (
          <div key={s} style={{ display:'flex', alignItems:'center', flex:1, minWidth:0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background: i<=step?'var(--accent)':'var(--border)', color: i<=step?'#fff':'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0, transition:'all .2s' }}>
                {i < step ? '✓' : i+1}
              </div>
              <div style={{ fontSize:'0.65rem', fontWeight:600, color: i<=step?'var(--accent)':'var(--text3)', marginTop:'0.3rem', textAlign:'center', whiteSpace:'nowrap' }}>{s}</div>
            </div>
            {i < STEPS.length-1 && <div style={{ height:2, flex:1, background: i<step?'var(--accent)':'var(--border)', margin:'0 0.25rem', marginBottom:'1.2rem' }}/>}
          </div>
        ))}
      </div>

      {/* Step 0 — Basic Info */}
      {step===0 && (
        <div className="card card-lg">
          <div className="form-group">
            <label className="form-label">Property Title *</label>
            <input className="form-control" placeholder="e.g. Sunrise Boys PG, Koregaon Park" value={form.title} onChange={e=>set('title',e.target.value)}/>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Property Type *</label>
              <select className="form-control" value={form.type} onChange={e=>set('type',e.target.value)}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Suitable For</label>
              <select className="form-control" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                {['Male','Female','Any'].map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-control" rows={4} placeholder="Describe your property, house rules, nearby landmarks, transport..." value={form.description} onChange={e=>set('description',e.target.value)}/>
          </div>
        </div>
      )}

      {/* Step 1 — Location & Pricing */}
      {step===1 && (
        <div className="card card-lg">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">City *</label>
              <select className="form-control" value={form.city} onChange={e=>set('city',e.target.value)}>
                {CITIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Address / Locality *</label>
              <input className="form-control" placeholder="e.g. Koregaon Park" value={form.address} onChange={e=>set('address',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rent (₹) *</label>
              <input className="form-control" type="number" min={500} placeholder="e.g. 8000" value={form.price}
                onChange={e=>{ set('price',e.target.value); checkFairPrice(e.target.value) }}/>
            </div>
            <div className="form-group">
              <label className="form-label">Security Deposit (₹)</label>
              <input className="form-control" type="number" min={0} placeholder="e.g. 16000" value={form.securityDeposit} onChange={e=>set('securityDeposit',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Room Size (sq ft) *</label>
              <input className="form-control" type="number" min={30} placeholder="e.g. 120" value={form.size} onChange={e=>set('size',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Floor Level</label>
              <select className="form-control" value={form.floor} onChange={e=>set('floor',e.target.value)}>
                {FLOORS.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Total Rooms</label>
              <input className="form-control" type="number" min={1} value={form.totalRooms} onChange={e=>set('totalRooms',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Available Rooms</label>
              <input className="form-control" type="number" min={0} value={form.availableRooms} onChange={e=>set('availableRooms',e.target.value)}/>
            </div>
          </div>
          {aiAlert && <div className={`alert alert-${aiAlert.type}`}>{aiAlert.msg}</div>}
        </div>
      )}

      {/* Step 2 — Amenities & Photos */}
      {step===2 && (
        <div className="card card-lg">
          <div style={{ marginBottom:'1.25rem' }}>
            <label className="form-label" style={{ marginBottom:'0.6rem', display:'block' }}>Amenities</label>
            <div className="amenity-picks">
              {ALL_AMENITIES.map(a=>(
                <span key={a} className={`amenity-pick ${amenities.includes(a)?'selected':''}`} onClick={()=>toggleAmenity(a)}>{a}</span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Property Photos (up to 8)</label>
            <input type="file" accept="image/*" multiple className="form-control"
              onChange={e=>setImages(Array.from(e.target.files).slice(0,8))}/>
            <p style={{ fontSize:'0.72rem', color:'var(--text3)', marginTop:'0.35rem' }}>JPG, PNG, WebP · Max 5MB each</p>
          </div>
          {images.length > 0 && (
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.5rem' }}>
              {images.map((img,i) => (
                <div key={i} style={{ width:72, height:54, borderRadius:6, overflow:'hidden', border:'1px solid var(--border)', position:'relative' }}>
                  <img src={URL.createObjectURL(img)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  <button onClick={()=>setImages(prev=>prev.filter((_,j)=>j!==i))}
                    style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,0.55)', color:'#fff', border:'none', borderRadius:'50%', width:16, height:16, fontSize:'0.65rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1.25rem', gap:'0.75rem' }}>
        <button className="btn btn-outline" onClick={()=>setStep(s=>s-1)} disabled={step===0}>← Back</button>
        {step < STEPS.length-1
          ? <button className="btn btn-secondary" onClick={()=>{ if(validateStep()) setStep(s=>s+1) }}>Next →</button>
          : <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Submitting...' : '✅ Submit Listing'}
            </button>
        }
      </div>
    </div>
  )
}
