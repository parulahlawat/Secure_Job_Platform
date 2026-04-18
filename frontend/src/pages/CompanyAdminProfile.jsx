import React, { useEffect, useState } from 'react';
import { profilesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function CompanyAdminProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await profilesAPI.getMe();
        setProfile(res.data);
        setForm(res.data);
      } catch (error) {
        toast.error('Failed to load company page');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profilesAPI.update(form);
      toast.success('Company page updated!');
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading company page...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form className="bg-white p-8 rounded shadow-md w-full max-w-lg" onSubmit={handleSave}>
        <h2 className="text-2xl font-bold mb-6 text-center">Manage Company Page</h2>
        <input
          name="company_name"
          type="text"
          placeholder="Company Name"
          className="w-full mb-4 p-3 border rounded"
          value={form.company_name || ''}
          onChange={handleChange}
          required
        />
        <input
          name="industry"
          type="text"
          placeholder="Industry"
          className="w-full mb-4 p-3 border rounded"
          value={form.industry || ''}
          onChange={handleChange}
        />
        <input
          name="website"
          type="url"
          placeholder="Website"
          className="w-full mb-4 p-3 border rounded"
          value={form.website || ''}
          onChange={handleChange}
        />
        <textarea
          name="bio"
          placeholder="Company Description"
          className="w-full mb-4 p-3 border rounded"
          value={form.bio || ''}
          onChange={handleChange}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
