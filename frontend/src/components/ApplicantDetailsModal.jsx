import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { messagesAPI } from '../services/api';
import { resumeAPI } from '../services/api';
import toast from 'react-hot-toast';
import VirtualKeyboard from './VirtualKeyboard';

export default function ApplicantDetailsModal({ open, onClose, applicant, jobId }) {
  // Define resumeData from applicant if available
  const resumeData = applicant && applicant.resume ? applicant.resume : null;
  // Get current user from auth store
  const user = useAuthStore.getState().user;
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingResume, setPendingResume] = useState(null);

  if (!open || !applicant) return null;

  // Send recruiter message to applicant
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    setSending(true);
    try {
      await messagesAPI.send({ recipient_id: applicant.user_id, ciphertext: messageText });
      toast.success('Message sent to applicant!');
      setMessageText('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handler for secure resume download (recruiter)
  const handleDownload = async () => {
    if (!applicant.resume_id) return;
    try {
      await resumeAPI.requestDownloadOTP(applicant.resume_id);
      setPendingResume({ id: applicant.resume_id, filename: applicant.resume_filename || 'resume.pdf' });
      setShowOTPModal(true);
      toast.success('OTP sent to your email!');
    } catch (e) {
      toast.error('Failed to send OTP for download');
    }
  };

  const handleOTPComplete = async (otpValue) => {
    setOtpLoading(true);
    try {
      // Always use the authenticated user's email (recruiter)
      const recruiterEmail = user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '');
      await resumeAPI.verifyDownloadOTP(pendingResume.id, otpValue, recruiterEmail);
      const res = await resumeAPI.download(pendingResume.id, otpValue);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = pendingResume.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded!');
    } catch (err) {
      toast.error('OTP invalid or download failed');
    } finally {
      setOtpLoading(false);
      setShowOTPModal(false);
      setPendingResume(null);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-2">Applicant Details</h2>
        <div className="mb-2">
          <span className="font-semibold">Name:</span> {applicant.user_name || 'N/A'}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Email:</span> {applicant.user_email || 'N/A'}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Experience:</span> {applicant.experience_years !== undefined && applicant.experience_years !== null ? applicant.experience_years + ' years' : 'N/A'}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Skills:</span> {applicant.skills && applicant.skills !== 'null' ? applicant.skills : 'N/A'}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Cover Letter:</span> {applicant.cover_letter || 'N/A'}
        </div>
        <div className="mb-2">
          {applicant.resume_id && (
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={handleDownload}
            >
              Download Resume
            </button>
          )}
        </div>
        {showOTPModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative">
              <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowOTPModal(false)}>✕</button>
              <h2 className="text-lg font-bold mb-4">Enter OTP to Download Resume</h2>
              <VirtualKeyboard onComplete={handleOTPComplete} length={6} />
              {otpLoading && <div className="text-blue-500 mt-2">Verifying...</div>}
            </div>
          </div>
        )}
        {/* Recruiter message send UI */}
        <div className="mt-4">
          <label className="block font-semibold mb-1">Message to Applicant</label>
          <textarea
            className="w-full border rounded p-2 mb-2"
            rows={3}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder="Write a message to the applicant..."
            disabled={sending}
          />
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={sending || !messageText.trim()}
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>

        </div>
      </div>
    </div>
  );
}
