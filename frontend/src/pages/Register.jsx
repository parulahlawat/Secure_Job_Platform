
import { useState } from 'react';
import { encryptionService } from '../services/encryption';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    company_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Only send company_name if role is recruiter
      const payload = { ...form };
      if (payload.role !== 'recruiter') {
        delete payload.company_name;
      }
      const response = await authAPI.register(payload);
      let { public_key, secret_key, otp_sent, email } = response.data;
      // Store backend-generated keys in localStorage
      localStorage.setItem('publicKey', public_key);
      localStorage.setItem('secretKey', secret_key);

      if (otp_sent) {
        setOtpStep(true);
        setPendingEmail(email);
        toast.success('OTP sent to your email. Please verify.');
      } else {
        toast.success('Registration successful!');
        navigate('/login');
      }
    } catch (error) {
      // Handle validation errors (422) and others
      if (error.response?.status === 422 && Array.isArray(error.response.data?.detail)) {
        const details = error.response.data.detail
          .map((d) => d.msg + (d.loc ? ` (${d.loc.join('.')})` : ''))
          .join('\n');
        toast.error(`Registration failed:\n${details}`);
      } else {
        const msg = error.response?.data?.detail || error.message || 'Registration failed';
        toast.error(`Registration failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(pendingEmail, otp);
      toast.success('Email verified! You can now login.');
      setOtpStep(false);
      navigate('/login');
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'OTP verification failed';
      toast.error(`OTP verification failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        {!otpStep ? (
          <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
            <div className="flex justify-center gap-6 mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={form.role === 'user'}
                  onChange={() => setForm(f => ({ ...f, role: 'user', company_name: '' }))}
                />
                User
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="recruiter"
                  checked={form.role === 'recruiter'}
                  onChange={() => setForm(f => ({ ...f, role: 'recruiter', full_name: '' }))}
                />
                Company Admin
              </label>
            </div>
            {form.role === 'user' && (
              <input
                name="full_name"
                type="text"
                placeholder="Full Name"
                className="w-full mb-4 p-3 border rounded"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            )}
            {form.role === 'recruiter' && (
              <input
                name="company_name"
                type="text"
                placeholder="Company Name"
                className="w-full mb-4 p-3 border rounded"
                value={form.company_name}
                onChange={handleChange}
                required
              />
            )}
            <input
              name="email"
              type="email"
              placeholder={form.role === 'recruiter' ? 'Company Email' : 'Email'}
              className="w-full mb-4 p-3 border rounded"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="w-full mb-4 p-3 border rounded"
              value={form.password}
              onChange={handleChange}
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify}>
            <h2 className="text-2xl font-bold mb-6 text-center">Verify Email</h2>
            <p className="mb-4 text-center text-gray-700">Enter the OTP sent to your email address.</p>
            <input
              name="otp"
              type="text"
              placeholder="Enter OTP"
              className="w-full mb-4 p-3 border rounded"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              maxLength={6}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-blue-500 hover:underline">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
