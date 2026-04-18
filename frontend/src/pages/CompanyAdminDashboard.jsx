import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profilesAPI, jobsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function CompanyAdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndJobs = async () => {
      try {
        const profileRes = await profilesAPI.getMe();
        setProfile(profileRes.data);
        const jobsRes = await jobsAPI.list({ recruiter_id: profileRes.data.id });
        setJobs(jobsRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndJobs();
  }, []);

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Company Admin Dashboard</h1>
            {profile && profile.company_name && (
              <div className="text-xl font-semibold text-blue-700 mt-1">{profile.company_name}</div>
            )}
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button
              onClick={() => navigate('/company-admin/profile')}
              className="text-blue-500 hover:text-blue-700 font-semibold transition"
            >Manage Company Page</button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                toast.success('Logged out');
                navigate('/login');
              }}
              className="text-red-500 hover:text-red-700 font-semibold transition"
            >Logout</button>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-4">Job Listings</h2>
        <div className="space-y-4">
          {jobs.length > 0 ? (
            jobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">{job.title}</h3>
                  <p className="text-blue-700 font-semibold mb-1">{job.company_name || (profile && profile.company_name) || <span className="text-gray-400">—</span>}</p>
                  <p className="text-gray-600">{job.location}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-blue-500 hover:underline mt-2"
                    onClick={() => navigate(`/company-admin/jobs/${job.id}`)}
                  >View Applicants</button>
                  <button
                    className="text-red-500 hover:underline mt-2"
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this job post?')) return;
                      try {
                        await jobsAPI.deleteJob(job.id);
                        toast.success('Job deleted');
                        setJobs(jobs.filter(j => j.id !== job.id));
                      } catch (err) {
                        toast.error('Failed to delete job');
                      }
                    }}
                  >Delete</button>
                </div>
              </div>
            ))
          ) : (
            <div>No jobs posted yet.</div>
          )}
        </div>
        <button
          className="mt-8 bg-green-600 text-white py-2 px-4 rounded font-semibold hover:bg-green-700 transition"
          onClick={() => navigate('/company-admin/jobs/new')}
        >Post New Job</button>
      </div>
    </div>
  );
}
