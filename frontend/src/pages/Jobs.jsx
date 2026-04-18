import React, { useState, useEffect } from 'react'
import { profilesAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { jobsAPI } from '../services/api'
import { useJobStore } from '../store'
import toast from 'react-hot-toast'

export default function Jobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [myApplications, setMyApplications] = useState([])
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const fetchJobsAndApplications = async (title = '') => {
    setSearching(true)
    try {
      const [jobsRes, profileRes] = await Promise.all([
        jobsAPI.list(title ? { title } : {}),
        profilesAPI.getMe()
      ])
      setJobs(jobsRes.data)
      setMyApplications(profileRes.data.job_applications || [])
    } catch (error) {
      toast.error('Failed to load jobs or applications')
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  useEffect(() => {
    fetchJobsAndApplications()
    // eslint-disable-next-line
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchJobsAndApplications(search)
  }

  if (loading) {
    return <div className="text-center py-8">Loading jobs...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Job Opportunities</h1>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Search jobs by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-xs"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            disabled={searching}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        <div className="space-y-4">
          {jobs.length > 0 ? (
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Job Title</th>
                  <th className="py-2 px-4 border">Location</th>
                  <th className="py-2 px-4 border">Description</th>
                  <th className="py-2 px-4 border">Deadline</th>
                  <th className="py-2 px-4 border">Status</th>
                  <th className="py-2 px-4 border"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const myApp = myApplications.find((app) => app.job_id === job.id)
                  return (
                    <tr key={job.id} className="border-b">
                      <td className="py-2 px-4 border font-bold">{job.title}</td>
                      <td className="py-2 px-4 border">{job.location}</td>
                      <td className="py-2 px-4 border">{job.description.substring(0, 40)}...</td>
                      <td className="py-2 px-4 border">{job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-2 px-4 border font-semibold">
                        {myApp ? (
                          <span className={
                            myApp.status === 'applied' ? 'text-blue-600' :
                            myApp.status === 'reviewing' ? 'text-yellow-600' :
                            myApp.status === 'shortlisted' ? 'text-purple-600' :
                            myApp.status === 'offered' ? 'text-green-600' :
                            myApp.status === 'rejected' ? 'text-red-600' : ''
                          }>
                            {myApp.status.charAt(0).toUpperCase() + myApp.status.slice(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not Applied</span>
                        )}
                      </td>
                      <td className="py-2 px-4 border">
                        <a href={`/jobs/${job.id}`} className="text-blue-500 hover:underline">
                          View Details
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No jobs available</p>
          )}
        </div>
      </div>
    </div>
  )
}
