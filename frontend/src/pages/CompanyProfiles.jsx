import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function CompanyProfiles() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get('/profiles/companies');
        setCompanies(response.data);
      } catch (error) {
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  if (loading) return <div>Loading companies...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Company Profiles</h2>
      <ul className="space-y-4">
        {companies.map(company => (
          <li key={company.id} className="bg-white p-4 rounded shadow">
            <div className="font-semibold text-lg">{company.company_name}</div>
            <div className="text-gray-600">Industry: {company.industry}</div>
            <div className="text-gray-600">Website: {company.website}</div>
            <button
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => navigate(`/company/${company.id}`)}
            >
              View Jobs
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
