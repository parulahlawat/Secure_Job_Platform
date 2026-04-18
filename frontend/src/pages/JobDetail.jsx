import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { jobsAPI, resumeAPI, recruiterMessagesAPI } from '../services/api'
import VirtualKeyboard from '../components/VirtualKeyboard'
import toast from 'react-hot-toast'

import { useAuthStore } from '../store'
import { authAPI } from '../services/api'

function JobDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resumes, setResumes] = useState([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [recruiterMessages, setRecruiterMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [showRecruiterMessages, setShowRecruiterMessages] = useState(false)
  const [user, setUser] = useState(useAuthStore.getState().user)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [pendingResumeId, setPendingResumeId] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)
  // Handler for secure resume download (recruiter)
  const handleDownloadResume = async (resumeId, filename) => {
    try {
      await resumeAPI.requestDownloadOTP(resumeId)
      setPendingResumeId({ id: resumeId, filename })
      setShowOTPModal(true)
      toast.success('OTP sent to your email!')
    } catch (e) {
      toast.error('Failed to send OTP for download')
    }
  }

  // Called when OTP is entered via virtual keyboard
  const handleOTPComplete = async (otpValue) => {
    setOtpLoading(true)
    try {
      let currentUser = user;
      if (!currentUser) {
        try {
          const res = await authAPI.getMe(useAuthStore.getState().token);
          currentUser = res.data;
          setUser(currentUser);
          useAuthStore.getState().setUser(currentUser);
        } catch {
          currentUser = null;
        }
      }
      if (!currentUser || !currentUser.email) {
        toast.error('User not authenticated. Please log in again.');
        setOtpLoading(false);
        return;
      }
      // Verify OTP (now with email)
      await resumeAPI.verifyDownloadOTP(pendingResumeId.id, otpValue, currentUser.email);
      // Download resume as blob
      const res = await resumeAPI.download(pendingResumeId.id, otpValue);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', pendingResumeId.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Resume downloaded!');
    } catch (e) {
      toast.error('OTP invalid or download failed');
    } finally {
      setOtpLoading(false);
      setShowOTPModal(false);
      setPendingResumeId(null);
    }
  }

  useEffect(() => {
    const fetchAll = async () => {
      let currentUser = user
      if (!currentUser) {
        try {
          const res = await authAPI.getMe(useAuthStore.getState().token)
          currentUser = res.data
          setUser(currentUser)
          useAuthStore.getState().setUser(currentUser)
        } catch {
          currentUser = null
        }
      }
      try {
        const response = await jobsAPI.get(id)
        setJob(response.data)
        // Fetch resumes for current user
        const resumesRes = await resumeAPI.getMyResumes()
        setResumes(resumesRes.data)
        if (resumesRes.data.length > 0) {
          setSelectedResumeId(resumesRes.data[0].id)
        }
      } catch (err) {
        setError('Job not found')
        toast.error('Failed to load job details or resumes')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line
  }, [id])

  // Fetch recruiter messages only when modal is opened
  const handleShowRecruiterMessages = async () => {
    setShowRecruiterMessages(true)
    setMessagesLoading(true)
    try {
      const msgRes = await recruiterMessagesAPI.getForJobApplicant(id, user?.id)
      setRecruiterMessages(msgRes.data)
    } catch {
      setRecruiterMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/jobs')}
              className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
            >
              ← Back to Jobs
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
              onClick={handleShowRecruiterMessages}
            >
              From Recruiter
            </button>
          </div>
        </div>
      </nav>

      {/* OTP Modal for secure resume download */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowOTPModal(false)}>✕</button>
            <h2 className="text-lg font-bold mb-4">Enter OTP to Download Resume</h2>
            <VirtualKeyboard onComplete={handleOTPComplete} length={6} />
            {otpLoading && <div className="text-blue-500 mt-2">Verifying...</div>}
          </div>
        </div>
      )}

      {/* Recruiter Messages Modal */}
      {showRecruiterMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={() => setShowRecruiterMessages(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-2">From Recruiter</h3>
            {messagesLoading ? (
              <div className="text-gray-500">Loading messages...</div>
            ) : recruiterMessages.length === 0 ? (
              <div className="text-gray-400">No messages from recruiter yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {recruiterMessages.map(msg => (
                  <li key={msg.id} className="py-2">
                    <div className="text-gray-800">{msg.ciphertext}</div>
                    <div className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : job ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-2">{job.title}</h2>
            {job.company_name && (
              <div className="text-lg font-semibold text-blue-700 mb-1">{job.company_name}</div>
            )}
            <p className="text-gray-600 mb-2">{job.location}</p>
            <p className="text-gray-700 mb-4">{job.description}</p>
            <div className="flex flex-wrap gap-4 mb-2">
              <span className="bg-gray-200 px-3 py-1 rounded text-sm">Type: {job.job_type}</span>
              <span className="bg-gray-200 px-3 py-1 rounded text-sm">Experience: {job.experience_level}</span>
              {job.salary_min !== null && (
                <span className="bg-gray-200 px-3 py-1 rounded text-sm">Min Salary: ₹{job.salary_min}</span>
              )}
              {job.salary_max !== null && (
                <span className="bg-gray-200 px-3 py-1 rounded text-sm">Max Salary: ₹{job.salary_max}</span>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-2">Posted on: {new Date(job.created_at).toLocaleDateString()}</div>
            <div className="text-sm text-red-500 mt-1 font-semibold">
              Application Deadline: {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : 'N/A'}
            </div>
            {/* Resume selection/upload UI */}
            <div className="mt-6">
              <label className="block font-semibold mb-2">Select Resume to Apply</label>
              {resumes.length > 0 ? (
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={selectedResumeId}
                  onChange={e => setSelectedResumeId(e.target.value)}
                >
                  {resumes.map(resume => (
                    <option key={resume.id} value={resume.id}>{resume.filename}</option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={async (e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      setUploading(true)
                      try {
                        const res = await resumeAPI.upload(file)
                        setResumes([res.data])
                        setSelectedResumeId(res.data.id)
                        toast.success('Resume uploaded!')
                      } catch {
                        toast.error('Failed to upload resume')
                      } finally {
                        setUploading(false)
                      }
                    }}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-blue-500 text-sm">Uploading...</span>}
                </div>
              )}
            </div>
            <button
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded font-semibold hover:bg-blue-700 transition"
              disabled={resumes.length === 0 || uploading}
              onClick={async () => {
                if (!selectedResumeId) {
                  toast.error('Please select or upload a resume first!')
                  return
                }
                try {
                  await jobsAPI.apply(job.id, selectedResumeId)
                  toast.success('Applied successfully!')
                } catch (err) {
                  toast.error('Failed to apply or already applied')
                }
              }}
            >Apply for this Job</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default JobDetail