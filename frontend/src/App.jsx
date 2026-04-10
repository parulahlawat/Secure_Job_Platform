import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store'
import Dashboard from './pages/Dashboard'
import ConnectionDashboard from './pages/ConnectionDashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import ChatWithUser from './pages/ChatWithUser'
import AdminDashboard from './pages/AdminDashboard'
import CompanyProfiles from './pages/CompanyProfiles'
import CompanyJobs from './pages/CompanyJobs'
import CompanyAdminLogin from './pages/CompanyAdminLogin'
import CompanyAdminDashboard from './pages/CompanyAdminDashboard'
import CompanyAdminProfile from './pages/CompanyAdminProfile'
import CompanyAdminJobNew from './pages/CompanyAdminJobNew'
import CompanyAdminJobApplicants from './pages/CompanyAdminJobApplicants'
import UserProfile from './pages/UserProfile'
import AdminMovements from "./components/AdminMovements";

export default function App() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize auth from localStorage
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      useAuthStore.getState().setToken(storedToken)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const isAuthenticated = !!token
  const isAdmin = user && typeof user.role === 'string' && user.role.toLowerCase() === 'admin'

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/" element={isAuthenticated && !isAdmin ? <Dashboard /> : isAuthenticated && isAdmin ? <Navigate to="/admin" /> : <Navigate to="/login" />} />
          <Route path="/jobs" element={isAuthenticated && !isAdmin ? <Jobs /> : <Navigate to="/login" />} />
          <Route path="/jobs/:id" element={isAuthenticated && !isAdmin ? <JobDetail /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated && !isAdmin ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/messages" element={isAuthenticated && !isAdmin ? <Messages /> : <Navigate to="/login" />} />
          <Route path="/messages/with/:id" element={isAuthenticated && !isAdmin ? <ChatWithUser /> : <Navigate to="/login" />} />
          <Route path="/companies" element={isAuthenticated && !isAdmin ? <CompanyProfiles /> : <Navigate to="/login" />} />
          <Route path="/company/:id" element={isAuthenticated && !isAdmin ? <CompanyJobs /> : <Navigate to="/login" />} />
          <Route path="/user/:id" element={isAuthenticated && !isAdmin ? <UserProfile token={token} /> : <Navigate to="/login" />} />
          {/* Company Admin routes */}
          <Route path="/company-admin/login" element={<CompanyAdminLogin />} />
          <Route path="/company-admin/dashboard" element={<CompanyAdminDashboard />} />
          <Route path="/company-admin/profile" element={<CompanyAdminProfile />} />
          <Route path="/company-admin/jobs/new" element={<CompanyAdminJobNew />} />
          <Route path="/company-admin/jobs/:jobId" element={<CompanyAdminJobApplicants />} />
          <Route path="/connections" element={isAuthenticated && !isAdmin ? <ConnectionDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/movements" element={<AdminMovements />} />
        </Routes>
      </Router>
    </>
  )
}
