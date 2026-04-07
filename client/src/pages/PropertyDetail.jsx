import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProperty, getReviews, createBooking, addReview } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import PropertyMap from '../components/PropertyMap'
import toast from 'react-hot-toast'

const EMOJIS = { PG:'🏢', Hostel:'🏨', Studio:'🏠', '1BHK':'🏡', '2BHK':'🏘️', 'Shared Room':'🛏️' }

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, toggleWishlist, isWishlisted } = useAuth()

  const [prop,    setProp]    = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState({ startDate:'', duration:3, notes:'' })
  const [bLoading,setBL]      = useState(false)
  const [review,  setReview]  = useState({ rating:5, comment:'' })
  const [rLoading,setRL]      = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    Promise.all([getProperty(id), getReviews(id)])
      .then(([pr, rv]) => { setProp(pr.data.property); setReviews(rv.data.reviews) })
      .catch(() => navigate('/search'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="spinner-wrap" style={{ paddingTop:'6rem' }}><div className="spinner" /></div>
  if (!prop)   return null

  const diff   = prop.aiPredictedPrice ? ((prop.price - prop.aiPredictedPrice) / prop.aiPredictedPrice * 100).toFixed(1) : null
  const listedW = Math.min(100, Math.round(prop.price / 200))
  const aiW     = Math.min(100, Math.round((prop.aiPredictedPrice || prop.price) / 200))

  async function handleBook() {
    if (!user) { toast.error('Please sign in to book'); return navigate('/auth') }
    if (!booking.startDate) { toast.error('Please select a move-in date'); return }
    setBL(true)
    try {
      const { data } = await createBooking({ propertyId: id, ...booking })
      toast.success('🎉 Booking request sent!')
      // Offer to pay
      if (confirm('Booking sent! Would you like to pay the deposit now?')) {
        navigate(`/payment/${data.booking._id}`)
      } else {
        navigate('/dashboard')
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Booking failed')
    } finally { setBL(false) }
  }

  async function handleReview() {
    if (!user) { toast.error('Please sign in to review'); return }
    if (!review.comment.trim()) { toast.error('Please write a comment'); return }
    setRL(true)
    try {
      const { data } = await addReview(id, review)
      setReviews(prev => [data.review, ...prev])
      setReview({ rating:5, comment:'' })
      toast.success('Review posted!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to post review')
    } finally { setRL(false) }
  }

  const images = prop.images?.length ? prop.images : []

  return (
    <div className="container page-wrap">
      <div style={{ marginBottom:'1rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="detail-grid">
        {/* LEFT */}
        <div>
          {/* Image Gallery */}
          <div className="detail-img" style={{ background:'var(--surface3)', position:'relative' }}>
            {images.length ? (
              <img src={images[activeImg]} alt={prop.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <span>{EMOJIS[prop.type] || '🏠'}</span>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => setActiveImg(i)}
                  style={{ width:60, height:45, borderRadius:6, overflow:'hidden', cursor:'pointer', border:`2px solid ${i===activeImg?'var(--accent)':'var(--border)'}` }}>
                  <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem', marginBottom:'0.75rem' }}>
            <div>
              <h2 style={{ fontSize:'1.6rem', marginBottom:'0.3rem' }}>{prop.title}</h2>
              <div style={{ fontSize:'0.85rem', color:'var(--text2)' }}>
                📍 {prop.location?.address}, {prop.location?.city} · 👥 {prop.gender} · 🏠 {prop.type}
              </div>
            </div>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
              <div className="rating-wrap"><span className="stars">★</span>{prop.rating?.toFixed(1)||'—'} ({prop.reviewCount||0})</div>
              <button className="btn btn-outline btn-sm" onClick={() => toggleWishlist(prop._id)}>
                {isWishlisted(prop._id) ? '❤️ Saved' : '🤍 Save'}
              </button>
              {/* Chat with owner */}
              {user && prop.owner?._id && user.id !== prop.owner._id && (
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/chat/${prop.owner._id}`)}>
                  💬 Chat Owner
                </button>
              )}
            </div>
          </div>

          <div className="info-tags">
            {prop.amenities?.map(a => <span key={a} className="info-tag">{a}</span>)}
            <span className="info-tag">📐 {prop.size} sq ft</span>
            <span className="info-tag">🛏️ {prop.availableRooms} available</span>
            <span className="info-tag">🏢 Floor: {prop.floor}</span>
          </div>

          <hr className="divider" />
          <p style={{ fontSize:'0.88rem', color:'var(--text2)', lineHeight:1.7, marginBottom:'1.25rem' }}>{prop.description}</p>

          {/* AI Analysis */}
          {prop.aiPredictedPrice && (
            <div className="ai-box">
              <div className="ai-box-title">🤖 AI Price Analysis</div>
              <div className="price-bar-row">
                <div className="price-bar-labels"><span>Listed Price</span><span style={{ fontWeight:600 }}>₹{prop.price?.toLocaleString()}/mo</span></div>
                <div className="price-bar-track"><div className="price-bar-fill" style={{ width:`${listedW}%`, background: Number(diff)>0?'#ef4444':'#3b82f6' }} /></div>
              </div>
              <div className="price-bar-row">
                <div className="price-bar-labels"><span>AI Fair Price</span><span style={{ fontWeight:600, color:'var(--success)' }}>₹{prop.aiPredictedPrice?.toLocaleString()}/mo</span></div>
                <div className="price-bar-track"><div className="price-bar-fill" style={{ width:`${aiW}%`, background:'#22c55e' }} /></div>
              </div>
              <div className={`alert ${Number(diff)>0?'alert-warning':'alert-success'}`} style={{ marginTop:'0.75rem' }}>
                {Number(diff)>0
                  ? `⚠️ Listed price is ${diff}% above the AI predicted fair value. Consider negotiating.`
                  : `🔥 Great deal! Listed ${Math.abs(diff)}% below AI fair price. Book quickly!`}
              </div>
            </div>
          )}

          {/* Map */}
          <div style={{ marginBottom:'1.25rem' }}>
            <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'0.75rem' }}>📍 Location</h3>
            <PropertyMap
              lat={prop.location?.coordinates?.lat}
              lng={prop.location?.coordinates?.lng}
              title={prop.title}
              city={prop.location?.city}
            />
          </div>

          <hr className="divider" />

          {/* Reviews */}
          <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem' }}>Reviews ({reviews.length})</h3>
          {user && (
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text2)', marginBottom:'0.5rem' }}>Write a Review</div>
              <div style={{ display:'flex', gap:'0.35rem', marginBottom:'0.75rem' }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} onClick={() => setReview(r => ({...r, rating:n}))}
                    style={{ fontSize:'1.3rem', cursor:'pointer', color: n<=review.rating?'var(--gold)':'var(--border)' }}>★</span>
                ))}
              </div>
              <textarea className="form-control" rows={3} placeholder="Share your experience..."
                value={review.comment} onChange={e => setReview(r => ({...r, comment:e.target.value}))} />
              <button className="btn btn-primary btn-sm" style={{ marginTop:'0.75rem' }}
                onClick={handleReview} disabled={rLoading}>
                {rLoading ? 'Posting...' : 'Post Review'}
              </button>
            </div>
          )}
          {reviews.map(r => (
            <div key={r._id} className="review-card">
              <div className="review-head">
                <div className="reviewer">{r.user?.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                  <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="review-text">{r.comment}</div>
            </div>
          ))}
          {!reviews.length && <p style={{ color:'var(--text2)', fontSize:'0.85rem' }}>No reviews yet. Be the first!</p>}
        </div>

        {/* RIGHT — Booking Card */}
        <div>
          <div className="book-card">
            <div className="book-price">₹{prop.price?.toLocaleString()} <small>/month</small></div>
            <div className="form-group">
              <label className="form-label">Move-in Date</label>
              <input type="date" className="form-control" value={booking.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setBooking(b => ({...b, startDate:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration</label>
              <select className="form-control" value={booking.duration}
                onChange={e => setBooking(b => ({...b, duration:Number(e.target.value)}))}>
                {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} Month{m>1?'s':''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-control" rows={2} placeholder="Any special requests..."
                value={booking.notes} onChange={e => setBooking(b => ({...b, notes:e.target.value}))} />
            </div>
            <hr className="divider" />
            <div className="total-row"><span>Monthly Rent</span><span>₹{prop.price?.toLocaleString()}</span></div>
            <div className="total-row"><span>Security Deposit</span><span>₹{(prop.securityDeposit||0).toLocaleString()}</span></div>
            <div className="total-row"><span>Service Fee</span><span>₹500</span></div>
            <div className="total-row grand"><span>Deposit Due Now</span><span>₹{((prop.securityDeposit||0)+500).toLocaleString()}</span></div>
            <button className="btn btn-primary btn-full" style={{ marginTop:'0.75rem' }}
              onClick={handleBook} disabled={bLoading}>
              {bLoading ? '⏳ Sending...' : '✅ Confirm Booking'}
            </button>
            <p style={{ fontSize:'0.72rem', color:'var(--text3)', textAlign:'center', marginTop:'0.6rem' }}>
              No payment charged until you confirm
            </p>
            <hr className="divider" />
            <div style={{ fontSize:'0.82rem', color:'var(--text2)' }}>
              <b>Owner:</b> {prop.owner?.name}<br/>
              <b>Contact:</b> {prop.owner?.phone || 'Available after booking'}
            </div>
            {user && prop.owner?._id && user.id !== prop.owner._id && (
              <button className="btn btn-outline btn-full" style={{ marginTop:'0.75rem' }}
                onClick={() => navigate(`/chat/${prop.owner._id}`)}>
                💬 Message Owner
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
