import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const EMOJIS = { PG:'🏢', Hostel:'🏨', Studio:'🏠', '1BHK':'🏡', '2BHK':'🏘️', 'Shared Room':'🛏️' }

function statusBadge(s) {
  if (s === 'overpriced') return <span className="badge badge-over">⚠️ Overpriced</span>
  if (s === 'deal')       return <span className="badge badge-deal">🔥 Great Deal</span>
  return                         <span className="badge badge-fair">✅ Fair Price</span>
}

export default function PropertyCard({ property: p }) {
  const navigate = useNavigate()
  const { user, toggleWishlist, isWishlisted } = useAuth()
  const wished = isWishlisted(p._id)

  const diff = p.aiPredictedPrice
    ? ((p.price - p.aiPredictedPrice) / p.aiPredictedPrice * 100).toFixed(0)
    : null

  async function handleWish(e) {
    e.stopPropagation()
    if (!user) { toast.error('Please sign in to save properties'); return }
    await toggleWishlist(p._id)
    toast.success(wished ? 'Removed from wishlist' : '❤️ Added to wishlist!')
  }

  return (
    <div className="prop-card" onClick={() => navigate(`/property/${p._id}`)}>
      <div className="card-img" style={{ background: '#f0f4ff' }}>
        {p.images?.length ? (
          <img src={p.images[0]} alt={p.title} />
        ) : (
          <span style={{ fontSize: '4rem' }}>{EMOJIS[p.type] || '🏠'}</span>
        )}
        <div className="badge-wrap">
          {statusBadge(p.priceStatus)}
          <span className="badge badge-ai">🤖 AI</span>
        </div>
        <button className="wish-btn" onClick={handleWish}>{wished ? '❤️' : '🤍'}</button>
      </div>

      <div className="card-body">
        <div className="card-title">{p.title}</div>
        <div className="card-loc">📍 {p.location?.address}, {p.location?.city} · {p.gender}</div>

        <div className="amenity-tags">
          {p.amenities?.slice(0, 3).map(a => <span key={a} className="tag">{a}</span>)}
          {p.amenities?.length > 3 && <span className="tag">+{p.amenities.length - 3}</span>}
        </div>

        <div className="card-footer">
          <div>
            <div className="price-big">
              ₹{p.price?.toLocaleString()} <span className="price-sub">/month</span>
            </div>
            {diff !== null && (
              <div className="ai-price-hint">
                AI fair: ₹{p.aiPredictedPrice?.toLocaleString()} ·{' '}
                {diff > 0
                  ? <b style={{ color: 'var(--danger)' }}>+{diff}% above</b>
                  : <b>{Math.abs(diff)}% below fair</b>}
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.4rem' }}>
            <div className="rating-wrap">
              <span className="stars">★</span>
              {p.rating?.toFixed(1) || '—'}
              <span style={{ color:'var(--text3)', fontWeight:400 }}>({p.reviewCount || 0})</span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); navigate(`/property/${p._id}`) }}
            >
              View & Book
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
