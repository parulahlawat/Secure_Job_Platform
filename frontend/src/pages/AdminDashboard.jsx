import React, { useEffect, useState } from 'react';
import AdminLoginLogs from './AdminLoginLogs';
import api, { adminAPI } from '../services/api';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [showResumesModal, setShowResumesModal] = useState(false);
  const [selectedUserResumes, setSelectedUserResumes] = useState([]);
  const [selectedUserName, setSelectedUserName] = useState('');
    // Fetch resumes for a user (admin access)
    const handleViewResumes = async (user) => {
      setLoading(true);
      setSelectedUserName(user.full_name || user.email);
      try {
        // Optionally check profile exists
        await api.get(`/profiles/${user.id}`);
        const resumesRes = await api.get(`/resume/by_user/${user.id}`);
        setSelectedUserResumes(resumesRes.data);
        setShowResumesModal(true);
      } catch (err) {
        toast.error('Failed to load resumes for user');
      } finally {
        setLoading(false);
      }
    };

    // Download resume as admin
    const handleDownloadResume = async (resumeId, filename) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await api.get(`/jobs/resume/${resumeId}/download`, {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` },
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } catch (err) {
        toast.error('Failed to download resume');
      }
    };
  const [showRecruiterJobs, setShowRecruiterJobs] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [deletedAccounts, setDeletedAccounts] = useState([]);
  const [showDeletedAccounts, setShowDeletedAccounts] = useState(false);
      const fetchDeletedAccounts = async () => {
        setLoading(true);
        try {
          const res = await adminAPI.getDeletedAccounts();
          setDeletedAccounts(res.data);
        } catch (err) {
          toast.error('Failed to load deleted accounts');
        } finally {
          setLoading(false);
        }
      };
    const fetchUsers = async () => {
      try {
        const response = await api.get('/admin/users');
        setUsers(response.data);
      } catch (err) {
        setError('Failed to load users');
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [showLoginLogs, setShowLoginLogs] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const email = localStorage.getItem('user_email') || 'Admin';

  useEffect(() => {
    fetchUsers();
  }, []);

    // Direct account deletion (no OTP)
    const handleDeleteUser = async (userId) => {
      if (!window.confirm('Are you sure you want to delete this user?')) return;
      try {
        await adminAPI.deleteUser(userId);
        toast.success('User deleted');
        fetchUsers();
      } catch (err) {
        toast.error('Failed to delete user');
      }
    };

  const handleViewRecruiterJobs = async (userId) => {
    setLoading(true);
    setSelectedRecruiter(userId);
    try {
      const res = await adminAPI.getRecruiterJobs(userId);
      setRecruiterJobs(res.data);
      setShowRecruiterJobs(true);
    } catch (err) {
      toast.error('Failed to load recruiter jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      logout();
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">FCS Admin</h1>
          <div className="flex items-center gap-4">
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
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
        <div className="flex gap-4 mb-6">
          <button
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
            onClick={() => { setShowManageAccounts(true); setShowDeletedAccounts(false); setShowLoginLogs(false); }}
          >
            Manage Accounts
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition"
            onClick={() => { setShowDeletedAccounts(true); setShowManageAccounts(false); setShowLoginLogs(false); fetchDeletedAccounts(); }}
          >
            Deleted Accounts
          </button>
          <button
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg transition"
            onClick={() => { setShowLoginLogs(true); setShowManageAccounts(false); setShowDeletedAccounts(false); }}
          >
            Login/Logout Logs
          </button>
        </div>
        {showLoginLogs ? (
          <AdminLoginLogs />
        ) : showManageAccounts ? (
          <div>
            <h3 className="text-xl font-semibold mb-2">All Registered Accounts</h3>
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border">User ID</th>
                    <th className="py-2 px-4 border">Email</th>
                    <th className="py-2 px-4 border">Full Name</th>
                    <th className="py-2 px-4 border">Role</th>
                    <th className="py-2 px-4 border">Registered</th>
                    <th className="py-2 px-4 border">Verified</th>
                    <th className="py-2 px-4 border">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="py-2 px-4 border">{user.id}</td>
                      <td className="py-2 px-4 border">{user.email}</td>
                      <td className="py-2 px-4 border">{user.full_name}</td>
                      <td className="py-2 px-4 border">{user.role}</td>
                      <td className="py-2 px-4 border">{user.registered_at}</td>
                      <td className="py-2 px-4 border">{user.is_verified ? 'Yes' : 'No'}</td>
                      <td className="py-2 px-4 border">{user.is_active ? 'Yes' : 'No'}</td>
                      <td className="py-2 px-4 border">
                        <button
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs mr-2"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                        {user.role === 'recruiter' && (
                          <button
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs mr-2"
                            onClick={() => handleViewRecruiterJobs(user.id)}
                            disabled={loading}
                          >
                            View Jobs
                          </button>
                        )}
                        <button
                          className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                          onClick={() => handleViewResumes(user)}
                          disabled={loading}
                        >
                          View Resumes
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Resumes Modal (move outside of <tr> to fix DOM nesting) */}
                  {showResumesModal && (
                    <tr>
                      <td colSpan="100%" style={{ padding: 0, border: 'none' }}>
                        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
                            <h3 className="text-lg font-semibold mb-2">Resumes for {selectedUserName}</h3>
                            {selectedUserResumes.length === 0 ? (
                              <div>No resumes found for this user.</div>
                            ) : (
                              <ul className="divide-y divide-gray-200">
                                {selectedUserResumes.map(resume => (
                                  <li key={resume.id} className="py-2 flex items-center justify-between">
                                    <span>{resume.filename}</span>
                                    <button
                                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                                      onClick={() => handleDownloadResume(resume.id, resume.filename)}
                                    >
                                      Download
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <button
                              className="mt-4 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition"
                              onClick={() => setShowResumesModal(false)}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <button
              className="mt-4 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition"
              onClick={() => setShowManageAccounts(false)}
            >
              Back to Dashboard
            </button>
            {showRecruiterJobs && (
              <div className="mt-6 bg-gray-100 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-2">Recruiter Jobs (User ID: {selectedRecruiter})</h4>
                {recruiterJobs.length === 0 ? (
                  <div>No jobs found for this recruiter.</div>
                ) : (
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border">Job ID</th>
                        <th className="py-2 px-4 border">Title</th>
                        <th className="py-2 px-4 border">Location</th>
                        <th className="py-2 px-4 border">Status</th>
                        <th className="py-2 px-4 border">Created</th>
                        <th className="py-2 px-4 border">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recruiterJobs.map(job => (
                        <tr key={job.id}>
                          <td className="py-2 px-4 border">{job.id}</td>
                          <td className="py-2 px-4 border">{job.title}</td>
                          <td className="py-2 px-4 border">{job.location}</td>
                          <td className="py-2 px-4 border">{job.status}</td>
                          <td className="py-2 px-4 border">{job.created_at}</td>
                          <td className="py-2 px-4 border">{job.is_active ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button
                  className="mt-2 px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded"
                  onClick={() => setShowRecruiterJobs(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ) : showDeletedAccounts ? (
          <div>
            <h3 className="text-xl font-semibold mb-2">Deleted Accounts</h3>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border">Email</th>
                    <th className="py-2 px-4 border">Full Name</th>
                    <th className="py-2 px-4 border">Role</th>
                    <th className="py-2 px-4 border">Deleted At</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedAccounts.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4">No deleted accounts found.</td></tr>
                  ) : (
                    deletedAccounts.map(acc => (
                      <tr key={acc.id}>
                        <td className="py-2 px-4 border">{acc.email}</td>
                        <td className="py-2 px-4 border">{acc.full_name}</td>
                        <td className="py-2 px-4 border">{acc.role}</td>
                        <td className="py-2 px-4 border">{new Date(acc.deleted_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            <button
              className="mt-4 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition"
              onClick={() => setShowDeletedAccounts(false)}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div>Welcome to the Admin Dashboard</div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
