import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useParams } from 'react-router-dom';

export default function CompanyJobs() {
  const { id } = useParams();
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await api.get(`/profiles/${id}`);
        setCompany(response.data);
      } catch (error) {
        setCompany(null);
      }
    };
    const fetchJobs = async () => {
      try {
        const response = await api.get(`/profiles/company/${id}/jobs`);
        setJobs(response.data);
      } catch (error) {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
    fetchJobs();
  }, [id]);

  if (loading) return <div>Loading jobs...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Jobs at {company?.company_name || 'Company'}</h2>
      <ul className="space-y-4">
        {jobs.length === 0 ? (
          <div>No jobs found for this company.</div>
        ) : (
          jobs.map(job => (
            <li key={job.id} className="bg-white p-4 rounded shadow">
              <div className="font-semibold text-lg">{job.title}</div>
              <div className="text-gray-600">{job.description}</div>
              <div className="text-gray-600">Location: {job.location}</div>
              <div className="text-gray-600">Type: {job.job_type}</div>
              <div className="text-gray-600">Experience: {job.experience_level}</div>
              <div className="text-red-500 font-semibold">Application Deadline: {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : 'N/A'}</div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
