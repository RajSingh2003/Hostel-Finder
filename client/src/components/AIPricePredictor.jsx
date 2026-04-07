import { useState } from 'react'
import { predictPrice } from '../utils/api'
import toast from 'react-hot-toast'

const CITIES    = ['Mumbai','Delhi','Pune','Bengaluru','Hyderabad','Chennai','Nashik','Nagpur','Ahmedabad','Kolkata']
const TYPES     = ['PG','Hostel','Studio','1BHK','2BHK','Shared Room']
const FLOORS    = ['Ground','1st','2nd','3rd','4th+']
const AMENITIES = ['WiFi','AC','Attached Bath','Meals Included','Gym','Laundry','Parking','CCTV','Lift','Hot Water','Furnished','Power Backup']

export default function AIPricePredictor() {
  const [form, setForm]     = useState({ city:'Pune', type:'PG', size:100, floor:'Ground' })
  const [selected, setSel]  = useState(['WiFi','AC'])
  const [result,  setResult]= useState(null)
  const [loading, setLoad]  = useState(false)

  function toggleA(a) { setSel(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev,a]) }

  async function predict() {
    if (!form.size || form.size < 30) { toast.error('Enter a valid room size (min 30 sq ft)'); return }
    setLoad(true)
    try {
      const { data } = await predictPrice({ ...form, amenities: selected })
      setResult(data.data)
    } catch {
      // Local fallback
      const base = {Mumbai:12000,Delhi:9000,Pune:8000,Bengaluru:10000,Hyderabad:9500,Chennai:8500,Nashik:6000,Nagpur:5500,Ahmedabad:7000,Kolkata:7000}
      const tm   = {PG:.65,Hostel:.6,Studio:1.3,'1BHK':1.5,'2BHK':2.2,'Shared Room':.55}
      const fm   = {Ground:0,'1st':200,'2nd':350,'3rd':500,'4th+':600}
      const am   = {WiFi:300,AC:800,'Meals Included':1200,Gym:400,Laundry:200,Parking:300,'Attached Bath':500,Furnished:1000,CCTV:150,Lift:200,'Hot Water':150,'Power Backup':250}
      let p = (base[form.city]||8000)*(tm[form.type]||0.8) + Number(form.size)*8 + (fm[form.floor]||0) + selected.reduce((s,a)=>s+(am[a]||0),0)
      p = Math.round(p/100)*100
      setResult({ predicted:p, range:{ low:Math.round(p*.88/100)*100, high:Math.round(p*1.15/100)*100 }, source:'local-fallback' })
    } finally { setLoad(false) }
  }

  return (
    <div className="card card-lg">
      <p style={{ fontSize:'0.83rem', color:'var(--text2)', marginBottom:'1.1rem', lineHeight:1.5 }}>
        Enter property details to get an AI-predicted fair rent using our Random Forest model trained on 50,000+ data points.
      </p>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">City</label>
          <select className="form-control" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}>
            {CITIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Room Type</label>
          <select className="form-control" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Room Size (sq ft)</label>
          <input className="form-control" type="number" min={30} placeholder="e.g. 120"
            value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">Floor Level</label>
          <select className="form-control" value={form.floor} onChange={e=>setForm(f=>({...f,floor:e.target.value}))}>
            {FLOORS.map(fl=><option key={fl}>{fl}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Amenities (select all that apply)</label>
        <div className="amenity-picks" style={{ marginTop:'0.4rem' }}>
          {AMENITIES.map(a=>(
            <span key={a} className={`amenity-pick ${selected.includes(a)?'selected':''}`} onClick={()=>toggleA(a)}>{a}</span>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary" onClick={predict} disabled={loading} style={{ marginTop:'0.25rem' }}>
        {loading ? '⏳ Predicting...' : '🔮 Predict Fair Price'}
      </button>

      {result && (
        <div className="pred-result">
          <div style={{ fontSize:'0.82rem', opacity:.75, marginBottom:'0.4rem' }}>AI Predicted Fair Rent</div>
          <div className="pred-amount">₹{result.predicted?.toLocaleString()}</div>
          <div className="pred-range">Range: ₹{result.range?.low?.toLocaleString()} – ₹{result.range?.high?.toLocaleString()}/month</div>
          <div className="pred-note">
            Model: {result.source==='ml-model' ? `Random Forest (R²: ${result.model_r2 || 'N/A'})` : 'Local Regression Fallback'}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:'1.5rem', marginTop:'1rem', flexWrap:'wrap' }}>
            {[
              { label:'Below Range', val:`< ₹${result.range?.low?.toLocaleString()}`, color:'#22c55e' },
              { label:'Fair Price',  val:`₹${result.range?.low?.toLocaleString()} – ₹${result.range?.high?.toLocaleString()}`, color:'#fff' },
              { label:'Overpriced',  val:`> ₹${result.range?.high?.toLocaleString()}`, color:'#ef4444' },
            ].map(b=>(
              <div key={b.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'0.65rem', opacity:.6, marginBottom:'0.2rem' }}>{b.label}</div>
                <div style={{ fontSize:'0.72rem', color:b.color, fontWeight:600 }}>{b.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
