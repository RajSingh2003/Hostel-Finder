import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sf_token')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

// ── Properties ────────────────────────────────────────────────────────────────
export const getProperties   = (p)     => api.get('/properties', { params: p })
export const getProperty     = (id)    => api.get(`/properties/${id}`)
export const addProperty     = (fd)    => api.post('/properties', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateProperty  = (id, d) => api.put(`/properties/${id}`, d)
export const deleteProperty  = (id)    => api.delete(`/properties/${id}`)
export const myListings      = ()      => api.get('/properties/owner/my-listings')

// ── Bookings ──────────────────────────────────────────────────────────────────
export const createBooking       = (d)        => api.post('/bookings', d)
export const myBookings          = ()         => api.get('/bookings/my')
export const ownerBookings       = ()         => api.get('/bookings/owner')
export const updateBookingStatus = (id, status) => api.put(`/bookings/${id}/status`, { status })
export const getBooking          = (id)       => api.get(`/bookings/${id}`)

// ── Reviews ───────────────────────────────────────────────────────────────────
export const getReviews = (propId)     => api.get(`/reviews/${propId}`)
export const addReview  = (propId, d)  => api.post(`/reviews/${propId}`, d)

// ── AI ────────────────────────────────────────────────────────────────────────
export const predictPrice       = (d) => api.post('/ai/predict-price', d)
export const checkPrice         = (d) => api.post('/ai/check-price', d)
export const getRecommendations = (p) => api.get('/ai/recommendations', { params: p })

// ── Payment ───────────────────────────────────────────────────────────────────
export const createPaymentOrder = (d) => api.post('/payment/create-order', d)
export const verifyPayment      = (d) => api.post('/payment/verify', d)
export const paymentHistory     = ()  => api.get('/payment/history')

// ── Agreement (PDF) ───────────────────────────────────────────────────────────
export const generateAgreement     = (bookingId) => api.post(`/agreement/generate/${bookingId}`, {}, { responseType: 'blob' })
export const checkAgreementExists  = (bookingId) => api.get(`/agreement/booking/${bookingId}`)
export const downloadAgreement     = (agreementId) => api.get(`/agreement/download/${agreementId}`, { responseType: 'blob' })
export const myAgreements          = ()           => api.get('/agreement/list')

// ── Chat ──────────────────────────────────────────────────────────────────────
export const getChatHistory    = (userId) => api.get(`/chat/history/${userId}`)
export const getConversations  = ()       => api.get('/chat/conversations')
export const markChatRead      = (roomId) => api.put(`/chat/read/${roomId}`)
export const chatUnreadCount   = ()       => api.get('/chat/unread-count')

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications  = (p)  => api.get('/notifications', { params: p })
export const getUnreadCount    = ()   => api.get('/notifications/unread-count')
export const markNotifRead     = (id) => api.put(`/notifications/${id}/read`)
export const markAllNotifsRead = ()   => api.put('/notifications/read-all')
export const deleteNotif       = (id) => api.delete(`/notifications/${id}`)
export const clearAllNotifs    = ()   => api.delete('/notifications/clear-all')

// ── Roommate ──────────────────────────────────────────────────────────────────
export const saveRoommateProfile  = (d)  => api.post('/roommate/profile', d)
export const getMyRoommateProfile = ()   => api.get('/roommate/profile/me')
export const getRoommateMatches   = ()   => api.get('/roommate/matches')
export const getRoommateProfile   = (id) => api.get(`/roommate/profile/${id}`)
export const connectRoommate      = (id) => api.post(`/roommate/connect/${id}`)

// ── Price Alerts ──────────────────────────────────────────────────────────────
export const createPriceAlert  = (d)  => api.post('/price-alerts', d)
export const getPriceAlerts    = ()   => api.get('/price-alerts')
export const deletePriceAlert  = (id) => api.delete(`/price-alerts/${id}`)
export const togglePriceAlert  = (id) => api.put(`/price-alerts/${id}/toggle`)

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminStats      = ()        => api.get('/admin/stats')
export const adminUsers      = (p)       => api.get('/admin/users', { params: p })
export const adminProperties = (p)       => api.get('/admin/properties', { params: p })
export const adminBookings   = (p)       => api.get('/admin/bookings', { params: p })
export const adminReviews    = ()        => api.get('/admin/reviews')
export const adminDeleteUser = (id)      => api.delete(`/admin/users/${id}`)
export const adminChangeRole = (id, r)   => api.put(`/admin/users/${id}/role`, { role: r })
export const adminApproveProperty = (id, a) => api.put(`/admin/properties/${id}/approve`, { approved: a })
export const adminDeleteProperty  = (id)    => api.delete(`/admin/properties/${id}`)
export const adminDeleteReview    = (id)    => api.delete(`/admin/reviews/${id}`)

export default api
