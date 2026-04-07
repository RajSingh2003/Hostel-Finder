import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Auth() {
  const [tab,     setTab]     = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const { login, register }   = useAuth()
  const navigate              = useNavigate()

  const [lf, setLF] = useState({ email:'', password:'' })
  const [rf, setRF] = useState({ name:'', email:'', password:'', phone:'', role:'tenant' })

  async function handleLogin(e) {
    e.preventDefault()
    if (!lf.email || !lf.password) { toast.error('Please fill all fields'); return }
    setLoading(true)
    try {
      await login(lf.email, lf.password)
      toast.success('✅ Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!rf.name || !rf.email || !rf.password) { toast.error('Please fill all required fields'); return }
    if (rf.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(rf)
      toast.success('🎉 Account created!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="container" style={{ paddingTop:'calc(var(--nav-h) + 1.5rem)', paddingBottom:'5.5rem' }}>
      <div className="auth-wrap">
        {/* Logo */}
        <div style={{ background:'var(--primary)', padding:'1.5rem', textAlign:'center' }}>
          <div style={{ fontFamily:'Playfair Display,serif', fontSize:'1.5rem', color:'#fff' }}>Stay<span style={{ color:'var(--accent)' }}>Finder</span></div>
          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)', marginTop:'0.2rem' }}>Smart Hostel & Room Finder</div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab==='login'?'active':''}`} onClick={()=>setTab('login')}>Sign In</button>
          <button className={`auth-tab ${tab==='register'?'active':''}`} onClick={()=>setTab('register')}>Register</button>
        </div>

        <div className="auth-body">
          {tab === 'login' ? (
            <>
              <h2>Welcome back</h2>
              <p>Sign in to manage bookings and wishlists</p>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input className="form-control" type="email" placeholder="you@email.com" required
                    value={lf.email} onChange={e=>setLF(f=>({...f,email:e.target.value}))} autoComplete="email"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-control" type={showPwd?'text':'password'} placeholder="••••••••" required
                      value={lf.password} onChange={e=>setLF(f=>({...f,password:e.target.value}))} autoComplete="current-password"
                      style={{ paddingRight:'2.5rem' }}/>
                    <button type="button" onClick={()=>setShowPwd(v=>!v)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'var(--text2)' }}>
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? '⏳ Signing in...' : 'Sign In'}
                </button>
              </form>
              <p style={{ fontSize:'0.8rem', color:'var(--text2)', marginTop:'1rem', textAlign:'center' }}>
                Don't have an account?{' '}
                <span style={{ color:'var(--accent)', cursor:'pointer', fontWeight:600 }} onClick={()=>setTab('register')}>Register free</span>
              </p>
            </>
          ) : (
            <>
              <h2>Create Account</h2>
              <p>Join 12,000+ tenants finding smarter rooms</p>
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" placeholder="Your full name" required
                    value={rf.name} onChange={e=>setRF(f=>({...f,name:e.target.value}))} autoComplete="name"/>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-control" type="email" placeholder="you@email.com" required
                      value={rf.email} onChange={e=>setRF(f=>({...f,email:e.target.value}))} autoComplete="email"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-control" type="tel" placeholder="+91 98765 43210"
                      value={rf.phone} onChange={e=>setRF(f=>({...f,phone:e.target.value}))} autoComplete="tel"/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Password * (min 6 chars)</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-control" type={showPwd?'text':'password'} placeholder="Min 6 characters" required
                      value={rf.password} onChange={e=>setRF(f=>({...f,password:e.target.value}))} autoComplete="new-password"
                      style={{ paddingRight:'2.5rem' }}/>
                    <button type="button" onClick={()=>setShowPwd(v=>!v)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'var(--text2)' }}>
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">I am a</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                    {[{v:'tenant',l:'🏠 Tenant',d:'Looking for a room'},{v:'owner',l:'🏢 Owner',d:'Listing property'}].map(opt=>(
                      <div key={opt.v} onClick={()=>setRF(f=>({...f,role:opt.v}))}
                        style={{ border:`2px solid ${rf.role===opt.v?'var(--accent)':'var(--border)'}`, borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', cursor:'pointer', background: rf.role===opt.v?'rgba(233,69,96,0.05)':'var(--surface)', transition:'all .18s' }}>
                        <div style={{ fontWeight:600, fontSize:'0.85rem', color: rf.role===opt.v?'var(--accent)':'var(--text)' }}>{opt.l}</div>
                        <div style={{ fontSize:'0.72rem', color:'var(--text2)', marginTop:'0.15rem' }}>{opt.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? '⏳ Creating...' : 'Create Account'}
                </button>
              </form>
              <p style={{ fontSize:'0.72rem', color:'var(--text3)', textAlign:'center', marginTop:'0.75rem' }}>
                By registering you agree to our Terms of Service
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
