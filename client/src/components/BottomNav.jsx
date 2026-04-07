import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const ALL_ITEMS = [
  { label:'Home',      icon:'🏠', path:'/',             roles:['all'] },
  { label:'Browse',    icon:'🔍', path:'/search',       roles:['all'] },
  { label:'Roomies',   icon:'🧑‍🤝‍🧑', path:'/roommates',    roles:['all'] },
  { label:'Dashboard', icon:'📊', path:'/dashboard',    roles:['tenant','owner'], notifBadge:true },
  { label:'List',      icon:'➕', path:'/add-property', roles:['owner'] },
  { label:'Admin',     icon:'🛡️', path:'/admin',        roles:['admin'] },
  { label:'Sign In',   icon:'👤', path:'/auth',         roles:['guest'] },
]

export default function BottomNav() {
  const { pathname }    = useLocation()
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const { unreadCount } = useNotifications()

  const items = ALL_ITEMS.filter(item => {
    if (item.roles.includes('all'))  return true
    if (item.roles.includes('guest') && !user) return true
    if (user && item.roles.includes(user.role)) return true
    return false
  })

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map(item => (
          <button
            key={item.path}
            className={`bn-btn ${pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            style={{ position:'relative' }}
          >
            <span className="bn-icon">{item.icon}</span>
            {item.label}
            {item.notifBadge && unreadCount > 0 && (
              <span className="bn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
