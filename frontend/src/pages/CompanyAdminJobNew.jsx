import React, { useState } from 'react';
import { jobsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function CompanyAdminJobNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    job_type: '',
    experience_level: '',
    salary_min: '',
    salary_max: '',
    application_deadline: '',
  });
  const [saving, setSaving] = useState(false);

  // Back button
  const handleBack = () => {
    navigate('/company-admin/dashboard');
  };


  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // Convert salary fields to float if not empty
    if ((name === 'salary_min' || name === 'salary_max') && value !== '') {
      setForm({ ...form, [name]: parseFloat(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate deadline is not in the past
    if (!form.application_deadline) {
      toast.error('Please select an application deadline.');
      return;
    }
    const deadlineDate = new Date(form.application_deadline);
    const now = new Date();
    // Set time to end of day for deadline
    deadlineDate.setHours(23,59,59,999);
    if (deadlineDate < now) {
      toast.error('Application deadline cannot be in the past.');
      return;
    }
    // Ensure ISO datetime string for backend
    let jobData = { ...form };
    if (jobData.application_deadline && !jobData.application_deadline.includes('T')) {
      jobData.application_deadline = jobData.application_deadline + 'T00:00:00';
    }
    setSaving(true);
    try {
      await jobsAPI.create(jobData);
      toast.success('Job posted!');
      navigate('/company-admin/dashboard');
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Failed to post job';
      toast.error(`Failed to post job: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-lg">
        <button
          onClick={handleBack}
          className="mb-4 text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
        >← Back</button>
        <form className="bg-white p-8 rounded shadow-md w-full" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold mb-6 text-center">Post New Job</h2>
          <input
            name="title"
            type="text"
            placeholder="Job Title"
            className="w-full mb-4 p-3 border rounded"
            value={form.title}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            placeholder="Job Description"
            className="w-full mb-4 p-3 border rounded"
            value={form.description}
            onChange={handleChange}
            required
          />
          <input
            name="location"
            type="text"
            placeholder="Location"
            className="w-full mb-4 p-3 border rounded"
            value={form.location}
            onChange={handleChange}
            required
          />
          <input
            name="job_type"
            type="text"
            placeholder="Job Type (e.g. Full-time)"
            className="w-full mb-4 p-3 border rounded"
            value={form.job_type}
            onChange={handleChange}
            required
          />
          <input
            name="experience_level"
            type="text"
            placeholder="Experience Level"
            className="w-full mb-4 p-3 border rounded"
            value={form.experience_level}
            onChange={handleChange}
            required
          />
          <input
            name="salary_min"
            type="number"
            placeholder="Minimum Salary"
            className="w-full mb-4 p-3 border rounded"
            value={form.salary_min}
            onChange={handleChange}
          />
          <input
            name="salary_max"
            type="number"
            placeholder="Maximum Salary"
            className="w-full mb-4 p-3 border rounded"
            value={form.salary_max}
            onChange={handleChange}
          />
          <label className="block mb-2 font-semibold">Application Deadline</label>
          <input
            name="application_deadline"
            type="date"
            className="w-full mb-4 p-3 border rounded"
            value={form.application_deadline}
            onChange={handleChange}
            required
            min={new Date().toISOString().split('T')[0]}
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition"
            disabled={saving}
          >
            {saving ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
