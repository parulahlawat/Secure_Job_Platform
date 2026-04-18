import React, { useState, useEffect } from 'react'
import Connections from '../components/Connections'
import { useNavigate } from 'react-router-dom'
import { profilesAPI, resumeAPI } from '../services/api'
import PrivacyField from '../components/PrivacyField'
import toast from 'react-hot-toast'

export default function Profile() {
    // Fetch user profile from API
    const fetchProfile = async () => {
      try {
        const res = await profilesAPI.getMe();
        setProfile(res.data);
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    // Fetch user resumes from API
    const fetchResumes = async () => {
      try {
        const res = await resumeAPI.getMyResumes();
        setResumes(res.data);
      } catch (error) {
        toast.error('Failed to load resumes');
      }
    };

    // Handle profile field change
    const handleFieldChange = (field, value) => {
      setProfile(prev => ({ ...prev, [field]: value }));
    };

    // Handle privacy field change
    const handlePrivacyChange = (field, value) => {
      setProfile(prev => ({ ...prev, [field]: value }));
    };

    // Save profile changes
    const handleSaveProfile = async () => {
      try {
        await profilesAPI.update(profile);
        toast.success('Profile updated!');
      } catch (error) {
        toast.error('Failed to update profile');
      }
    };

    // Handle resume upload
    const handleResumeUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await resumeAPI.upload(file);
        toast.success('Resume uploaded!');
        fetchResumes();
      } catch (error) {
        toast.error('Failed to upload resume');
      }
    };

    // Handle resume delete
    const [deleteErrorJobs, setDeleteErrorJobs] = useState(null);
    const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
    const handleDeleteResume = async (resumeId) => {
      try {
        await resumeAPI.delete(resumeId);
        toast.success('Resume deleted!');
        fetchResumes();
      } catch (error) {
        // Check if error response contains blocking jobs
        const detail = error?.response?.data?.detail;
        if (detail && detail.jobs && Array.isArray(detail.jobs) && detail.jobs.length > 0) {
          setDeleteErrorJobs(detail.jobs);
          setShowDeleteErrorModal(true);
        } else {
          toast.error('Failed to delete resume');
        }
      }
    };
    // Modal for blocking jobs on delete error
    const DeleteErrorModal = ({ jobs, onClose }) => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-bold mb-2 text-red-600">Resume cannot be deleted</h3>
          <p className="mb-3">This resume is used in the following job application(s):</p>
          <ul className="mb-4 list-disc list-inside text-gray-700">
            {jobs.map(job => (
              <li key={job.id}><span className="font-semibold">{job.title}</span> (Job ID: {job.id})</li>
            ))}
          </ul>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    bio: '',
    bio_privacy: 'public',
    location: '',
    location_privacy: 'public',
    skills: '',
    skills_privacy: 'public',
    experience_years: '',
    experience_privacy: 'public',
    website: '',
    website_privacy: 'public'
  })

  const [resumes, setResumes] = useState([])
  const [matchingJobs, setMatchingJobs] = useState({})
  const [loadingMatches, setLoadingMatches] = useState({})
    const handleShowMatches = async (resumeId) => {
      setLoadingMatches(prev => ({ ...prev, [resumeId]: true }))
      try {
        const res = await resumeAPI.matchResume(resumeId)
        setMatchingJobs(prev => ({ ...prev, [resumeId]: res.data }))
      } catch (error) {
        setMatchingJobs(prev => ({ ...prev, [resumeId]: [] }))
        toast.error('Failed to fetch matching jobs')
      } finally {
        setLoadingMatches(prev => ({ ...prev, [resumeId]: false }))
      }
    }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
    fetchResumes()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showDeleteErrorModal && deleteErrorJobs && (
        <DeleteErrorModal jobs={deleteErrorJobs} onClose={() => setShowDeleteErrorModal(false)} />
      )}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">My Profile</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Connections Feature */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <Connections token={localStorage.getItem('token')} />
        </div>
                {/* Job Applications Status */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                  <h2 className="text-xl font-bold mb-6">📝 My Job Applications</h2>
                  {profile.job_applications && profile.job_applications.length > 0 ? (
                    <table className="min-w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-2 px-4 border">Job Title</th>
                          <th className="py-2 px-4 border">Status</th>
                          <th className="py-2 px-4 border">Applied At</th>
                          <th className="py-2 px-4 border">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.job_applications.map((app) => (
                          <tr key={app.application_id} className="border-b">
                            <td className="py-2 px-4 border">{app.job_title || app.job_id}</td>
                            <td className="py-2 px-4 border font-semibold">
                              <span className={
                                app.status === 'applied' ? 'text-blue-600' :
                                app.status === 'reviewing' ? 'text-yellow-600' :
                                app.status === 'shortlisted' ? 'text-purple-600' :
                                app.status === 'offered' ? 'text-green-600' :
                                app.status === 'rejected' ? 'text-red-600' : ''
                              }>
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-2 px-4 border">{new Date(app.applied_at).toLocaleDateString()}</td>
                            <td className="py-2 px-4 border">{new Date(app.updated_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-center py-4">You have not applied to any jobs yet.</p>
                  )}
                </div>
        {/* Profile Information */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-bold mb-6">Profile Information</h2>

          <PrivacyField
            label="Bio"
            value={profile.bio}
            onChange={(v) => handleFieldChange('bio', v)}
            privacy={profile.bio_privacy}
            onPrivacyChange={(p) => handlePrivacyChange('bio_privacy', p)}
            multiline={true}
          />

          <PrivacyField
            label="Location"
            value={profile.location}
            onChange={(v) => handleFieldChange('location', v)}
            privacy={profile.location_privacy}
            onPrivacyChange={(p) => handlePrivacyChange('location_privacy', p)}
          />

          <PrivacyField
            label="Skills"
            value={profile.skills}
            onChange={(v) => handleFieldChange('skills', v)}
            privacy={profile.skills_privacy}
            onPrivacyChange={(p) => handlePrivacyChange('skills_privacy', p)}
            multiline={true}
          />

          <PrivacyField
            label="Years of Experience"
            value={profile.experience_years}
            onChange={(v) => handleFieldChange('experience_years', v)}
            privacy={profile.experience_privacy}
            onPrivacyChange={(p) => handlePrivacyChange('experience_privacy', p)}
            type="number"
          />

          <PrivacyField
            label="Website/Portfolio"
            value={profile.website}
            onChange={(v) => handleFieldChange('website', v)}
            privacy={profile.website_privacy}
            onPrivacyChange={(p) => handlePrivacyChange('website_privacy', p)}
            type="url"
          />

          <button
            onClick={handleSaveProfile}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Save Profile
          </button>
        </div>

        {/* Resume Management */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-bold mb-6">📄 Resume Management</h2>

          {/* Upload */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
            <p className="text-gray-600 mb-3">
              🔒 Resumes are encrypted before storage
            </p>
            <label className="cursor-pointer" htmlFor="resume-upload">
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />
              <button
                type="button"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition"
                onClick={() => document.getElementById('resume-upload').click()}
              >
                Upload Resume
              </button>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supported: PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>

          {/* Resume List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">Your Resumes</h3>
            <>
              {resumes.length > 0 ? (
                <div className="space-y-2">
                  {resumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{resume.filename}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {resume.is_primary && (
                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded">
                              Primary
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteResume(resume.id)}
                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm transition"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleShowMatches(resume.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm transition"
                            disabled={loadingMatches[resume.id]}
                          >
                            {loadingMatches[resume.id] ? 'Loading...' : 'Show Matching Jobs'}
                          </button>
                        </div>
                      </div>
                      {/* Matching Jobs Section */}
                      {matchingJobs[resume.id] && (
                        <div className="mt-2 bg-white border border-blue-200 rounded p-3">
                          <h4 className="font-semibold text-blue-700 mb-2">Matching Jobs</h4>
                          {matchingJobs[resume.id].length === 0 ? (
                            <p className="text-gray-500 text-sm">No matching jobs found.</p>
                          ) : (
                            <ul className="space-y-1">
                              {matchingJobs[resume.id].map(job => (
                                <li key={job.job_id} className="border-b last:border-b-0 pb-1 last:pb-0">
                                  <span className="font-medium">{job.title}</span>
                                  <span className="ml-2 text-xs text-gray-600">Match Score: {job.match_score}</span>
                                  {job.matched_skills && job.matched_skills.length > 0 && (
                                    <span className="ml-2 text-xs text-green-700">Skills: {job.matched_skills.join(', ')}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No resumes uploaded yet</p>
              )}
            </>
          </div>

          {/* Security Info */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-sm text-blue-700">
            <p className="font-semibold">🔐 Resume Security</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>✓ Encrypted with AES-256</li>
              <li>✓ Verified with PKI signatures</li>
              <li>✓ Access logged for audit</li>
              <li>✓ Only accessible to you and authorized recruiters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
