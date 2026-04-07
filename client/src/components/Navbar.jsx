import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout }    = useAuth()
  const { unreadCount }     = useNotifications()
  const navigate            = useNavigate()
  const { pathname }        = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const active = (p) => pathname === p ? 'nav-link active' : 'nav-link'
  const close  = ()  => setMenuOpen(false)

  function handleLogout() { logout(); navigate('/'); close() }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={close}>Stay<span>Finder</span></Link>

      {/* Desktop links */}
      <div className="nav-desktop-links">
        <Link to="/"          className={active('/')}>Home</Link>
        <Link to="/search"    className={active('/search')}>Browse</Link>
        <Link to="/roommates" className={active('/roommates')}>🧑‍🤝‍🧑 Roommates</Link>
        {user && <Link to="/dashboard"    className={active('/dashboard')}>Dashboard</Link>}
        {user?.role === 'owner' && <Link to="/add-property" className={active('/add-property')}>List Property</Link>}
        {user?.role === 'admin' && <Link to="/admin" className={active('/admin')} style={{ color:'var(--gold)' }}>🛡️ Admin</Link>}
      </div>

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.45rem', marginLeft:'auto' }}>
        {user && <NotificationBell />}

        <div className="nav-desktop-links" style={{ alignItems:'center', gap:'0.4rem' }}>
          {user ? (
            <>
              <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.8rem', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                Hi, {user.name?.split(' ')[0]}
              </span>
              <button className="nav-link" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/auth" className="nav-link cta">Sign In</Link>
          )}
        </div>

        {/* Hamburger */}
        <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span className={`ham-line ${menuOpen ? 'open1' : ''}`}/>
          <span className={`ham-line ${menuOpen ? 'open2' : ''}`}/>
          <span className={`ham-line ${menuOpen ? 'open3' : ''}`}/>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/"          className="mob-menu-link" onClick={close}>🏠 Home</Link>
          <Link to="/search"    className="mob-menu-link" onClick={close}>🔍 Browse Rooms</Link>
          <Link to="/roommates" className="mob-menu-link" onClick={close}>🧑‍🤝‍🧑 Roommate Finder</Link>
          {user && <Link to="/dashboard"    className="mob-menu-link" onClick={close}>📊 Dashboard</Link>}
          {user?.role === 'owner' && <Link to="/add-property" className="mob-menu-link" onClick={close}>➕ List Property</Link>}
          {user?.role === 'admin' && <Link to="/admin"        className="mob-menu-link" onClick={close}>🛡️ Admin Panel</Link>}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', margin:'0.5rem 0' }}/>
          {user ? (
            <>
              <div style={{ padding:'0.5rem 1.5rem', fontSize:'0.78rem', color:'rgba(255,255,255,0.45)' }}>
                Signed in as {user.name}
              </div>
              <button className="mob-menu-link" style={{ background:'none', border:'none', width:'100%', textAlign:'left', color:'var(--accent)' }} onClick={handleLogout}>
                🚪 Logout
              </button>
            </>
          ) : (
            <Link to="/auth" className="mob-menu-link" style={{ color:'var(--accent)', fontWeight:600 }} onClick={close}>
              👤 Sign In / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
