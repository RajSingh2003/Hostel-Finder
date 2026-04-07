import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true)
    const s     = document.createElement('script')
    s.id        = 'razorpay-script'
    s.src       = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload    = () => resolve(true)
    s.onerror   = () => resolve(false)
    document.body.appendChild(s)
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Payment() {
  const { bookingId } = useParams()
  const { user }      = useAuth()
  const navigate      = useNavigate()

  const [booking,     setBooking]     = useState(null)
  const [paying,      setPaying]      = useState(false)
  const [paid,        setPaid]        = useState(false)
  const [agreementId, setAgreementId] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    axios.get(`/api/bookings/${bookingId}`)
      .then(async r => {
        const b = r.data.booking
        setBooking(b)
        if (b.paymentStatus === 'paid') {
          setPaid(true)
          // Check if agreement already generated
          try {
            const ag = await axios.get(`/api/agreement/booking/${bookingId}`)
            if (ag.data.exists) setAgreementId(ag.data.agreement?.agreementId)
          } catch {}
        }
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [bookingId])

  async function handlePay() {
    setPaying(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { toast.error('Could not load Razorpay'); setPaying(false); return }

      const { data } = await axios.post('/api/payment/create-order', { bookingId })

      if (data.isMock) {
        await axios.post('/api/payment/verify', {
          razorpay_order_id:   data.order.id,
          razorpay_payment_id: `mock_pay_${Date.now()}`,
          razorpay_signature:  'mock_sig',
          bookingId,
        })
        toast.success('✅ Payment successful (demo mode)!')
        setPaid(true)
        setTimeout(() => triggerAgreementDownload(), 1500)
        return
      }

      const options = {
        key:         data.key,
        amount:      data.order.amount,
        currency:    'INR',
        name:        'StayFinder',
        description: `Booking — ${booking?.property?.title}`,
        order_id:    data.order.id,
        prefill:     { name: user.name, email: user.email },
        theme:       { color: '#e94560' },
        handler: async (response) => {
          try {
            await axios.post('/api/payment/verify', { ...response, bookingId })
            toast.success('✅ Payment successful!')
            setPaid(true)
            setTimeout(() => triggerAgreementDownload(), 1500)
          } catch {
            toast.error('Verification failed. Contact support.')
          }
        },
        modal: { ondismiss: () => { setPaying(false); toast('Payment cancelled') } }
      }
      new window.Razorpay(options).open()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Payment failed')
      setPaying(false)
    }
  }

  async function triggerAgreementDownload() {
    setDownloading(true)
    toast('📄 Generating your rental agreement…', { duration: 3000 })
    try {
      const res = await axios.post(
        `/api/agreement/generate/${bookingId}`,
        {},
        { responseType: 'blob' }
      )
      const contentDisp = res.headers['content-disposition'] || ''
      const match       = contentDisp.match(/filename="(.+?)"/)
      const filename    = match ? match[1] : `StayFinder_Agreement.pdf`
      downloadBlob(res.data, filename)
      toast.success('📄 Agreement downloaded!')
      // Try to parse agreement ID from header
      const agId = res.headers['x-agreement-id']
      if (agId) setAgreementId(agId)
    } catch (e) {
      // Agreement might already exist — try fetching it
      try {
        const ag = await axios.get(`/api/agreement/booking/${bookingId}`)
        if (ag.data.exists) setAgreementId(ag.data.agreement?.agreementId)
      } catch {}
      console.warn('Agreement download error:', e.message)
    } finally {
      setDownloading(false)
    }
  }

  async function redownloadAgreement() {
    if (!agreementId) { await triggerAgreementDownload(); return }
    setDownloading(true)
    try {
      const res = await axios.get(
        `/api/agreement/download/${agreementId}`,
        { responseType: 'blob' }
      )
      downloadBlob(res.data, `StayFinder_Agreement_${agreementId}.pdf`)
      toast.success('📄 Agreement downloaded!')
    } catch {
      toast.error('Could not download agreement')
    } finally { setDownloading(false) }
  }

  if (loading) return <div className="spinner-wrap" style={{ paddingTop:'6rem' }}><div className="spinner"/></div>
  if (!booking) return null

  const prop      = booking.property
  const amountDue = (booking.securityDeposit || 0) + 500

  return (
    <div className="container page-wrap">
      <div style={{ maxWidth:500, margin:'0 auto' }}>
        <div className="section-title">💰 Complete <span>Payment</span></div>

        {paid ? (
          /* ── Success State ─────────────────────────────────────── */
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
            {/* Green banner */}
            <div style={{ background:'linear-gradient(135deg,#166534,#15803d)', padding:'2rem', textAlign:'center', color:'#fff' }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.6rem' }}>🎉</div>
              <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.4rem', marginBottom:'0.35rem' }}>Payment Successful!</h2>
              <p style={{ opacity:.85, fontSize:'0.88rem' }}>₹{amountDue.toLocaleString()} confirmed for {prop?.title}</p>
            </div>

            <div style={{ padding:'1.5rem' }}>
              {/* Agreement card */}
              <div style={{ background:'#eff6ff', border:'1px solid #3b82f6', borderRadius:'var(--radius-sm)', padding:'1rem', marginBottom:'1rem' }}>
                <div style={{ fontWeight:600, fontSize:'0.9rem', color:'#1e40af', marginBottom:'0.4rem' }}>📄 Rental Agreement Ready</div>
                <p style={{ fontSize:'0.82rem', color:'#1e3a8a', marginBottom:'0.85rem' }}>
                  Your digital rental agreement has been auto-generated and emailed to you.
                  {agreementId && <> Agreement ID: <strong>{agreementId}</strong></>}
                </p>
                <button
                  className="btn btn-secondary btn-full"
                  onClick={redownloadAgreement}
                  disabled={downloading}
                >
                  {downloading ? '⏳ Preparing PDF…' : '⬇️ Download Agreement PDF'}
                </button>
              </div>

              {/* Breakdown */}
              <div className="total-row"><span>Amount Paid</span><span style={{ color:'var(--success)', fontWeight:600 }}>₹{amountDue.toLocaleString()}</span></div>
              <div className="total-row"><span>Property</span><span>{prop?.title}</span></div>
              <div className="total-row"><span>Move-in</span><span>{new Date(booking.startDate).toLocaleDateString('en-IN')}</span></div>
              <div className="total-row"><span>Duration</span><span>{booking.duration} month(s)</span></div>

              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.25rem', flexWrap:'wrap' }}>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate('/dashboard')}>
                  📊 View Dashboard
                </button>
                <button className="btn btn-outline" style={{ flex:1 }} onClick={() => navigate('/search')}>
                  🔍 Browse More
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Payment Form ──────────────────────────────────────── */
          <div className="card card-lg">
            {/* Property info */}
            <div style={{ display:'flex', gap:'1rem', marginBottom:'1.25rem', padding:'0.9rem', background:'var(--surface2)', borderRadius:'var(--radius-sm)' }}>
              <div style={{ fontSize:'2.2rem', flexShrink:0 }}>🏠</div>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.92rem', marginBottom:'0.2rem' }}>{prop?.title}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>📍 {prop?.location?.city} · {booking.duration} month(s)</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>📅 Move-in: {new Date(booking.startDate).toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="total-row"><span>Monthly Rent</span><span>₹{prop?.price?.toLocaleString()}/mo</span></div>
            <div className="total-row"><span>Security Deposit</span><span>₹{(booking.securityDeposit||0).toLocaleString()}</span></div>
            <div className="total-row"><span>Service Fee</span><span>₹500</span></div>
            <div className="total-row grand"><span>Amount Due Now</span><span>₹{amountDue.toLocaleString()}</span></div>

            {/* What happens next */}
            <div style={{ background:'#f0fdf4', border:'1px solid #22c55e', borderRadius:'var(--radius-sm)', padding:'0.85rem', margin:'0.85rem 0', fontSize:'0.82rem', color:'#166534' }}>
              ✅ After payment:&nbsp;
              <strong>Rental agreement PDF auto-generated &amp; emailed to you instantly</strong>
            </div>

            <div className="alert alert-info" style={{ marginTop:0 }}>
              ℹ️ Deposit + service fee only. Monthly rent paid directly to the owner.
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ marginTop:'1rem' }}
              onClick={handlePay}
              disabled={paying || booking.paymentStatus === 'paid'}
            >
              {booking.paymentStatus === 'paid'
                ? '✅ Already Paid'
                : paying
                  ? '⏳ Processing…'
                  : `💳 Pay ₹${amountDue.toLocaleString()} via Razorpay`}
            </button>

            <div style={{ display:'flex', justifyContent:'center', gap:'1rem', marginTop:'0.85rem', flexWrap:'wrap' }}>
              {['🔒 Secure', '⚡ Instant', '📄 Auto-Agreement', '↩️ Refundable'].map(f => (
                <span key={f} style={{ fontSize:'0.72rem', color:'var(--text2)' }}>{f}</span>
              ))}
            </div>

            <p style={{ fontSize:'0.7rem', color:'var(--text3)', textAlign:'center', marginTop:'0.6rem' }}>
              Powered by Razorpay · UPI, Cards, Netbanking accepted
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
