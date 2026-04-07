import { Routes, Route } from 'react-router-dom'
import { Toaster }            from 'react-hot-toast'
import { AuthProvider }         from './context/AuthContext'
import { SocketProvider }       from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'
import Navbar            from './components/Navbar'
import BottomNav         from './components/BottomNav'
import Home              from './pages/Home'
import Search            from './pages/Search'
import PropertyDetail    from './pages/PropertyDetail'
import Dashboard         from './pages/Dashboard'
import AddProperty       from './pages/AddProperty'
import Auth              from './pages/Auth'
import Chat              from './pages/Chat'
import Payment           from './pages/Payment'
import AdminDashboard    from './pages/AdminDashboard'
import RoommateFinder    from './pages/RoommateFinder'

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Navbar />
          <Routes>
            <Route path="/"                   element={<Home />} />
            <Route path="/search"             element={<Search />} />
            <Route path="/property/:id"       element={<PropertyDetail />} />
            <Route path="/dashboard"          element={<Dashboard />} />
            <Route path="/add-property"       element={<AddProperty />} />
            <Route path="/auth"               element={<Auth />} />
            <Route path="/chat/:userId"       element={<Chat />} />
            <Route path="/payment/:bookingId" element={<Payment />} />
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/roommates"          element={<RoommateFinder />} />
            <Route path="*"                   element={<Home />} />
          </Routes>
          <BottomNav />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: { background:'#1a1a2e', color:'#fff', fontSize:'0.85rem', borderRadius:10, maxWidth:'90vw' },
              success: { style: { background:'#166534' } },
              error:   { style: { background:'#991b1b' } },
            }}
          />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  )
}
