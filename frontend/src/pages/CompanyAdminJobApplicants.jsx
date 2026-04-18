import React, { useEffect, useState } from 'react';
import { jobsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import ApplicantDetailsModal from '../components/ApplicantDetailsModal';

export default function CompanyAdminJobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const res = await jobsAPI.getApplications(jobId);
        setApplicants(res.data);
      } catch (error) {
        toast.error('Failed to load applicants');
      } finally {
        setLoading(false);
      }
    };
    fetchApplicants();
  }, [jobId]);

  if (loading) return <div className="text-center py-8">Loading applicants...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Applicants for Job #{jobId}</h1>
          <button
            onClick={() => navigate('/company-admin/dashboard')}
            className="text-blue-500 hover:text-blue-700 font-semibold transition"
          >Back to Dashboard</button>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {applicants.length > 0 ? (
            applicants.map(app => (
              <div key={app.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold">
                      {app.user_name || 'N/A'} <span className="text-gray-500 font-normal">({app.user_email || 'N/A'})</span>
                    </h3>
                    <p className="text-gray-600 text-sm">Experience: {app.experience_years !== undefined && app.experience_years !== null ? app.experience_years + ' years' : 'N/A'}</p>
                    <p className="text-gray-600 text-sm">Skills: {app.skills && app.skills !== 'null' ? app.skills : 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Status:</span>
                    <select
                      className="border rounded px-2 py-1"
                      value={app.status}
                      onChange={async (e) => {
                        try {
                          await jobsAPI.updateApplicationStatus(app.id, e.target.value)
                          setApplicants((prev) => prev.map(a => a.id === app.id ? { ...a, status: e.target.value } : a))
                          toast.success('Status updated!')
                        } catch (error) {
                          toast.error('Failed to update status: ' + (error.response?.data?.detail || error.message))
                        }
                      }}
                    >
                      <option value="applied">Applied</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="offered">Offered</option>
                    </select>
                    <button
                      className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      onClick={() => { setSelectedApplicant(app); setModalOpen(true); }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div>No applicants yet.</div>
          )}
          <ApplicantDetailsModal open={modalOpen} onClose={() => setModalOpen(false)} applicant={selectedApplicant} jobId={jobId} />
        </div>
      </div>
    </div>
  );
}
