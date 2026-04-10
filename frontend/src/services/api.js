// Recruiter messages API
export const recruiterMessagesAPI = {
  getForJobApplicant: (jobId, applicantId) => api.get(`/jobs/${jobId}/applications/${applicantId}/recruiter-messages`),
};
// Admin API
export const adminAPI = {
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getRecruiterJobs: (userId) => api.get(`/admin/recruiter/${userId}/jobs`),
  getDeletedAccounts: () => api.get('/admin/deleted-accounts'), // NEW
};

import axios from 'axios'
import { useAuthStore } from '../store'

// Utility to read a cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Determine API base URL based on environment
const isDevelopment = import.meta.env.DEV
const protocol = window.location.protocol


// Use relative path for API in development so Vite proxy handles HTTPS correctly
const API_BASE = '/api/v1'

console.log('🌐 API Base URL:', API_BASE, ' (Protocol:', protocol, ')')

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

// Request interceptor to add token and CSRF header
api.interceptors.request.use((config) => {
  // Try Zustand first, then localStorage fallback
  let token = null;
  try {
    token = useAuthStore.getState().token;
  } catch {}
  if (!token) {
    try {
      token = localStorage.getItem('token');
    } catch {}
  }
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add CSRF token for state-changing requests
  const method = config.method && config.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  requestOTP: (email, forRegistration = false) => {
    if (forRegistration) {
      return api.post('/auth/register-otp', { email });
    }
    return api.post('/auth/request-otp', { email });
  },
  getMe: (token) => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  resetPassword: (data) => api.post('/auth/reset-password', data), // NEW
}

// Jobs API
export const jobsAPI = {
  list: (params) => api.get('/jobs/', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs/', data),
  apply: (jobId, resume_id, cover_letter = null) => api.post(`/jobs/${jobId}/apply`, { resume_id, cover_letter }),
  getApplications: (jobId) => api.get(`/jobs/${jobId}/applications`),
  updateApplicationStatus: (applicationId, status) => api.put(`/jobs/applications/${applicationId}/status`, { status }),
  deleteJob: (jobId) => api.delete(`/jobs/${jobId}`), // NEW
}

// Profiles API
export const profilesAPI = {
  get: (id) => api.get(`/profiles/${id}`),
  getByUser: (userId) => api.get(`/profiles/by_user/${userId}`),
  getMe: () => api.get('/profiles/me'),
  update: (data) => api.put('/profiles/me/full', data),
  getAll: () => api.get('/profiles/'), // NEW: fetch all user profiles
}

// Messages API
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getWith: (userId) => api.get(`/messages/with/${userId}`),
  send: (data) => api.post('/messages/send', data),
  markRead: (messageId) => api.put(`/messages/${messageId}/mark-read`),
  markAllRead: (userId) => api.put(`/messages/with/${userId}/mark-all-read`),
}

// Resume API
export const resumeAPI = {
  getMyResumes: () => api.get('/resume/my-resumes'),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // The Authorization header is already set by the axios interceptor
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  matchResume: (resumeId) => api.get(`/resume/match/${resumeId}`),
  delete: (id) => api.delete(`/resume/${id}`),
  // --- OTP-protected download ---
  requestDownloadOTP: (resumeId) => api.post(`/resume/request-download-otp/${resumeId}`),
  verifyDownloadOTP: (resumeId, otp, email) => api.post(`/resume/verify-download-otp/${resumeId}`, { email, otp }),
  download: (resumeId, otp) => api.get(`/resume/download/${resumeId}`, { params: { otp }, responseType: 'blob' }),
}

export default api
