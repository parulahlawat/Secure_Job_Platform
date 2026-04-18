import React, { useEffect, useState } from 'react'
import Connections from '../components/Connections'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { profilesAPI } from '../services/api'
import toast from 'react-hot-toast'
import UserSearch from '../components/UserSearch'

export default function Dashboard() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const email = localStorage.getItem('user_email') || 'User'
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await profilesAPI.getMe()
        setProfile(response.data)
      } catch (error) {
        console.error('Failed to load profile', error)
      }
    }
    fetchProfile()
    // Social features removed: fetchConnections and fetchViewers
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try {
      logout()
      toast.success('Logged out successfully!')
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">FCS</h1>
          <div className="flex items-center space-x-6">
            <div className="space-x-4">
              <a href="/jobs" className="text-blue-500 hover:underline">Jobs</a>
              <a href="/messages" className="text-blue-500 hover:underline">Messages</a>
              <a href="/connections" className="text-blue-500 hover:underline">Connections</a>
              <a href="/profile" className="text-blue-500 hover:underline">Profile</a>
            </div>
            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Welcome</p>
                <p className="text-xs text-gray-500">{email}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* User Search Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <UserSearch token={localStorage.getItem('token')} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-2">Profile Summary</h2>
          {profile ? (
            <div>
              <p className="text-lg font-semibold">{email}</p>
              {profile.bio && <p className="mt-2 text-gray-700">{profile.bio}</p>}
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.location && <p><span className="font-medium">Location:</span> {profile.location}</p>}
                {profile.skills && <p><span className="font-medium">Skills:</span> {profile.skills}</p>}
                {profile.experience_years !== undefined && profile.experience_years !== null && <p><span className="font-medium">Experience:</span> {profile.experience_years} years</p>}
                {profile.website && <p><span className="font-medium">Website:</span> <a href={profile.website} className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">{profile.website}</a></p>}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading profile...</p>
          )}
        </div>
        {/* Connections Feature */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <Connections token={localStorage.getItem('token')} />
        </div>
      </div>
    </>
  )
}
