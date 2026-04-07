import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const CITIES  = ['Mumbai','Delhi','Pune','Bengaluru','Hyderabad','Chennai','Nashik','Nagpur','Ahmedabad','Kolkata']
const TYPES   = ['PG','Hostel','Studio','1BHK','2BHK','Shared Room']

const DEFAULTS = {
  city:'Pune', area:'', minBudget:5000, maxBudget:12000,
  roomType:'Shared Room', gender:'Any',
  wakeTime:'Flexible', sleepTime:'Flexible',
  workSchedule:'Office 9-5', cleanliness:3,
  noiseLevel:'Moderate', guestPolicy:'Occasional',
  smoking:false, drinking:false, pets:false,
  cooking:'Occasionally', sharingCommon:true,
  preferSameGender:false,
  bio:'', occupation:'', age:22,
}

function ScoreRing({ score }) {
  const r   = 26
  const circ= 2 * Math.PI * r
  const fill= circ - (score / 100) * circ
  const col = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
      <svg width={64} height={64} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--border)" strokeWidth={4}/>
        <circle cx={32} cy={32} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset .6s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.78rem', color:col }}>
        {score}%
      </div>
    </div>
  )
}

function CompatBadge({ label, match }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: match?'#dcfce7':'#fee2e2', color: match?'#166534':'#991b1b', borderRadius:20, padding:'0.18rem 0.55rem', fontSize:'0.7rem', fontWeight:600 }}>
      {match ? '✓' : '✗'} {label}
    </span>
  )
}

export default function RoommateFinder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab,     setTab]     = useState('matches')  // matches | profile | alerts
  const [profile, setProfile] = useState(null)
  const [form,    setForm]    = useState(DEFAULTS)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [alerts,  setAlerts]  = useState([])
  const [alertForm, setAlertForm] = useState({ city:'Pune', type:'any_alert', maxBudget:'', targetPrice:'', roomType:'' })

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadAll()
  }, [user])

  async function loadAll() {
    setLoading(true)
    try {
      const [pRes, aRes] = await Promise.all([
        axios.get('/api/roommate/profile/me').catch(()=>null),
        axios.get('/api/price-alerts').catch(()=>({ data:{ alerts:[] } })),
      ])
      if (pRes?.data?.profile) {
        setProfile(pRes.data.profile)
        setForm({ ...DEFAULTS, ...pRes.data.profile })
        loadMatches()
      }
      setAlerts(aRes.data.alerts || [])
    } catch {} finally { setLoading(false) }
  }

  async function loadMatches() {
    try {
      const { data } = await axios.get('/api/roommate/matches')
      setMatches(data.matches || [])
    } catch {}
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await axios.post('/api/roommate/profile', form)
      setProfile(data.profile)
      toast.success('✅ Profile saved! Finding your matches…')
      await loadMatches()
      setTab('matches')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  async function createAlert() {
    if (!alertForm.city) { toast.error('Please select a city'); return }
    try {
      const { data } = await axios.post('/api/price-alerts', alertForm)
      setAlerts(prev => [data.alert, ...prev])
      toast.success('🔔 Alert created!')
      setAlertForm({ city:'Pune', type:'any_alert', maxBudget:'', targetPrice:'', roomType:'' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  async function deleteAlert(id) {
    await axios.delete(`/api/price-alerts/${id}`)
    setAlerts(prev => prev.filter(a => a._id !== id))
    toast.success('Alert removed')
  }

  async function handleConnect(targetUserId, score) {
    if (!targetUserId) return
    try {
      const { data } = await axios.post(`/api/roommate/connect/${targetUserId}`)
      toast.success(`🎯 ${data.message} Notification sent!`)
    } catch (e) {
      // Even if connect fails (profile not found etc), still navigate to chat
      console.warn('Connect notification failed:', e.message)
    }
    navigate(`/chat/${targetUserId}`)
  }

  if (loading) return <div className="spinner-wrap" style={{ paddingTop:'6rem' }}><div className="spinner"/></div>

  return (
    <div 
  className="container" 
  style={{ 
    paddingTop: '5.5rem',   // fixed safe spacing for navbar
    paddingBottom: '5.5rem',
    overflow: 'visible'     // prevent text cutting
  }}
>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div className="section-title" style={{ margin:0 }}>🧑‍🤝‍🧑 Roommate <span>Finder</span></div>
        {profile && <span style={{ background:'#dcfce7', color:'#166534', borderRadius:20, padding:'0.2rem 0.7rem', fontSize:'0.75rem', fontWeight:600 }}>✓ Profile Active</span>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.35rem', marginBottom:'1.25rem', borderBottom:'1px solid var(--border)', paddingBottom:'0.6rem', flexWrap:'wrap' }}>
        {[['matches','🔍 Matches'],['profile','👤 My Profile'],['alerts','🔔 Smart Alerts']].map(([k,l]) => (
          <button key={k} className={`chip ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── MATCHES ─────────────────────────────────────────────────────── */}
      {tab === 'matches' && (
        <>
          {!profile ? (
            <div className="empty">
              <div className="empty-icon">👤</div>
              <p style={{ fontWeight:600, marginBottom:'0.5rem' }}>Create your roommate profile first</p>
              <p style={{ fontSize:'0.85rem', color:'var(--text2)', marginBottom:'1rem' }}>Tell us your lifestyle and preferences to find compatible roommates.</p>
              <button className="btn btn-primary" onClick={()=>setTab('profile')}>Create Profile →</button>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <p>No matches found yet in {form.city}.</p>
              <p style={{ fontSize:'0.82rem', color:'var(--text2)', marginTop:'0.4rem' }}>We'll notify you when someone compatible joins!</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <p style={{ fontSize:'0.85rem', color:'var(--text2)' }}>Found <strong>{matches.length}</strong> compatible roommates in {form.city}</p>
              {matches.map(({ profile: p, score }) => (
                <div key={p._id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.1rem', display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                  <ScoreRing score={score}/>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.4rem', marginBottom:'0.5rem' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{p.user?.name || 'Anonymous'}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>{p.occupation || 'Not specified'} · {p.age ? `${p.age} yrs` : ''}</div>
                      </div>
                      <div style={{ display:'flex', gap:'0.4rem' }}>
                        <span style={{ background:'var(--surface2)', borderRadius:6, padding:'0.25rem 0.6rem', fontSize:'0.75rem', fontWeight:600, color:'var(--text2)' }}>
                          ₹{p.minBudget?.toLocaleString()}–₹{p.maxBudget?.toLocaleString()}
                        </span>
                        <span style={{ background:'var(--surface2)', borderRadius:6, padding:'0.25rem 0.6rem', fontSize:'0.75rem', color:'var(--text2)' }}>
                          {p.roomType}
                        </span>
                      </div>
                    </div>

                    {p.bio && <p style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'0.6rem', lineHeight:1.5 }}>{p.bio}</p>}

                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginBottom:'0.75rem' }}>
                      <CompatBadge label={`Budget ₹${p.minBudget?.toLocaleString()}–${p.maxBudget?.toLocaleString()}`} match={true}/>
                      <CompatBadge label={p.noiseLevel} match={p.noiseLevel === form.noiseLevel}/>
                      <CompatBadge label={`Cleanliness ${p.cleanliness}/5`} match={Math.abs(p.cleanliness - form.cleanliness) <= 1}/>
                      <CompatBadge label={`Wakes ${p.wakeTime}`} match={p.wakeTime === form.wakeTime || p.wakeTime === 'Flexible' || form.wakeTime === 'Flexible'}/>
                      {!p.smoking && <CompatBadge label="Non-smoker" match={!form.smoking}/>}
                      {p.pets && <CompatBadge label="Has pets" match={form.pets}/>}
                    </div>

                    <button className="btn btn-primary btn-sm" onClick={()=>handleConnect(p.user?._id, score)}>
                      💬 Connect & Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PROFILE FORM ────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <form onSubmit={saveProfile}>
          <div className="card card-lg" style={{ marginBottom:'1rem' }}>
            <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text2)', marginBottom:'1rem' }}>📍 Location & Budget</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">City *</label>
                <select className="form-control" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}>
                  {CITIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Area</label>
                <input className="form-control" placeholder="e.g. Koregaon Park" value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Min Budget (₹/mo)</label>
                <input className="form-control" type="number" min={1000} value={form.minBudget} onChange={e=>setForm(f=>({...f,minBudget:Number(e.target.value)}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Max Budget (₹/mo)</label>
                <input className="form-control" type="number" min={1000} value={form.maxBudget} onChange={e=>setForm(f=>({...f,maxBudget:Number(e.target.value)}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Looking For</label>
                <select className="form-control" value={form.roomType} onChange={e=>setForm(f=>({...f,roomType:e.target.value}))}>
                  {TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                  {['Male','Female','Any'].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card card-lg" style={{ marginBottom:'1rem' }}>
            <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text2)', marginBottom:'1rem' }}>🌅 Daily Schedule</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Wake Up Time</label>
                <select className="form-control" value={form.wakeTime} onChange={e=>setForm(f=>({...f,wakeTime:e.target.value}))}>
                  {['Early bird (5-8am)','Morning (8-10am)','Flexible','Night owl (after 11pm)'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sleep Time</label>
                <select className="form-control" value={form.sleepTime} onChange={e=>setForm(f=>({...f,sleepTime:e.target.value}))}>
                  {['Early (9-10pm)','Normal (10-12am)','Late (after 12am)','Flexible'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Work Schedule</label>
                <select className="form-control" value={form.workSchedule} onChange={e=>setForm(f=>({...f,workSchedule:e.target.value}))}>
                  {['Work from home','Office 9-5','Night shifts','Student','Flexible'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cooking Habit</label>
                <select className="form-control" value={form.cooking} onChange={e=>setForm(f=>({...f,cooking:e.target.value}))}>
                  {['I cook daily','Occasionally','Rarely/Order out'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card card-lg" style={{ marginBottom:'1rem' }}>
            <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text2)', marginBottom:'1rem' }}>🏠 Lifestyle Preferences</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Noise Level</label>
                <select className="form-control" value={form.noiseLevel} onChange={e=>setForm(f=>({...f,noiseLevel:e.target.value}))}>
                  {['Quiet','Moderate','Lively'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Guest Policy</label>
                <select className="form-control" value={form.guestPolicy} onChange={e=>setForm(f=>({...f,guestPolicy:e.target.value}))}>
                  {['No guests','Occasional','Frequent'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cleanliness (1–5)</label>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <input type="range" min={1} max={5} step={1} value={form.cleanliness} onChange={e=>setForm(f=>({...f,cleanliness:Number(e.target.value)}))} style={{ flex:1 }}/>
                  <span style={{ fontWeight:600, minWidth:20, fontSize:'0.9rem' }}>{form.cleanliness}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'var(--text3)', marginTop:2 }}>
                  <span>Relaxed</span><span>Very clean</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-control" type="number" min={18} max={80} value={form.age} onChange={e=>setForm(f=>({...f,age:Number(e.target.value)}))}/>
              </div>
            </div>

            {/* Boolean toggles */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginTop:'0.5rem' }}>
              {[
                ['smoking',  '🚬 Smoker'],
                ['drinking', '🍺 Drinks'],
                ['pets',     '🐾 Has pets'],
                ['sharingCommon','🍳 Shares kitchen/bath'],
                ['preferSameGender','👥 Prefer same gender'],
              ].map(([key, label]) => (
                <label key={key} style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', fontSize:'0.85rem', userSelect:'none' }}>
                  <div onClick={()=>setForm(f=>({...f,[key]:!f[key]}))}
                    style={{ width:40, height:22, borderRadius:11, background:form[key]?'var(--accent)':'var(--border)', position:'relative', transition:'background .18s', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:2, left: form[key]?20:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .18s' }}/>
                  </div>
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="card card-lg" style={{ marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text2)', marginBottom:'1rem' }}>📝 About You</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input className="form-control" placeholder="e.g. Software Engineer, Student" value={form.occupation} onChange={e=>setForm(f=>({...f,occupation:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                  {['Male','Female','Any'].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bio (shown to matches)</label>
              <textarea className="form-control" rows={3} placeholder="Tell potential roommates about yourself — habits, interests, what you're looking for..." value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))}/>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding:'0.8rem 2.5rem', fontSize:'1rem' }} disabled={saving}>
            {saving ? '⏳ Saving…' : profile ? '💾 Update Profile' : '🚀 Create Profile & Find Matches'}
          </button>
        </form>
      )}

      {/* ── SMART ALERTS ────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div>
          <p style={{ fontSize:'0.85rem', color:'var(--text2)', marginBottom:'1.25rem' }}>
            Get instantly notified when a price drops or a new room matches your criteria.
          </p>

          {/* Create alert form */}
          <div className="card card-lg" style={{ marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text2)', marginBottom:'1rem' }}>🔔 Create New Alert</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <select className="form-control" value={alertForm.city} onChange={e=>setAlertForm(f=>({...f,city:e.target.value}))}>
                  {CITIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Alert Type</label>
                <select className="form-control" value={alertForm.type} onChange={e=>setAlertForm(f=>({...f,type:e.target.value}))}>
                  <option value="any_alert">Price drop OR new room</option>
                  <option value="price_drop">Price drop only</option>
                  <option value="new_room">New room available</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Budget (₹)</label>
                <input className="form-control" type="number" placeholder="e.g. 10000" value={alertForm.maxBudget} onChange={e=>setAlertForm(f=>({...f,maxBudget:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Room Type (optional)</label>
                <select className="form-control" value={alertForm.roomType} onChange={e=>setAlertForm(f=>({...f,roomType:e.target.value}))}>
                  <option value="">Any type</option>
                  {TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {alertForm.type === 'price_drop' && (
              <div className="form-group">
                <label className="form-label">Alert me when price drops below (₹)</label>
                <input className="form-control" type="number" placeholder="e.g. 8000" value={alertForm.targetPrice} onChange={e=>setAlertForm(f=>({...f,targetPrice:e.target.value}))}/>
              </div>
            )}
            <button className="btn btn-secondary" onClick={createAlert} style={{ marginTop:'0.5rem' }}>
              🔔 Create Alert
            </button>
          </div>

          {/* Alert list */}
          {alerts.length === 0 ? (
            <div className="empty"><div className="empty-icon">🔔</div><p>No alerts yet. Create one above.</p></div>
          ) : alerts.map(a => (
            <div key={a._id} className="review-card" style={{ marginBottom:'0.65rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.88rem', marginBottom:'0.2rem' }}>
                  {a.type === 'price_drop' ? '📉' : a.type === 'new_room' ? '🏠' : '🔔'}
                  {' '}{a.city} · {a.roomType || 'Any type'}
                </div>
                <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>
                  {a.maxBudget ? `Max ₹${a.maxBudget.toLocaleString()}` : 'Any budget'}
                  {a.targetPrice ? ` · Alert if below ₹${a.targetPrice.toLocaleString()}` : ''}
                  {a.lastTriggered ? ` · Last fired: ${new Date(a.lastTriggered).toLocaleDateString()}` : ' · Never triggered'}
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.4rem' }}>
                <span className={`status-badge ${a.active?'status-active':'status-cancelled'}`}>{a.active?'Active':'Paused'}</span>
                <button className="btn btn-outline btn-sm" style={{ color:'var(--danger)', borderColor:'var(--danger)' }} onClick={()=>deleteAlert(a._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
