import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { authAPI, profilesAPI } from '../services/api'
import { encryptionService } from '../services/encryption'
import VirtualKeyboard from '../components/VirtualKeyboard'
import toast from 'react-hot-toast'

// --- Forgot Password Modal ---
function ForgotPasswordModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  React.useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Use the same logic as 'Use OTP Instead (Secure)' for sending OTP
  const handleSendOTP = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.requestOTP(email);
      toast.success('OTP sent to your email! Please check your inbox.');
      setStep(2);
      setResendTimer(60);
    } catch (error) {
      console.error('OTP request error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to request OTP';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword) return toast.error('Fill all fields');
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, new_password: newPassword });
      toast.success('Password reset successful!');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>✕</button>
        <h2 className="text-lg font-bold mb-4">Forgot Password</h2>
        {step === 1 ? (
          <>
            <label className="block text-sm font-medium mb-1">Registered Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded mb-4" />
            <button onClick={handleSendOTP} disabled={loading || resendTimer > 0} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
              {loading ? 'Sending...' : resendTimer > 0 ? `Send OTP (${resendTimer}s)` : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-1">OTP (enter using virtual keyboard)</label>
            <VirtualKeyboard onComplete={setOTP} length={6} />
            <label className="block text-sm font-medium mb-1 mt-4">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded mb-4" />
            <button onClick={handleResetPassword} disabled={loading || otp.length !== 6} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">{loading ? 'Resetting...' : 'Reset Password'}</button>
            <button onClick={handleSendOTP} disabled={loading || resendTimer > 0} className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
              {loading ? 'Sending...' : resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [useOTP, setUseOTP] = useState(false)
  const [otp, setOTP] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  // --- Lockout timer state ---
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [lockoutMessage, setLockoutMessage] = useState('');

  // Lockout timer effect
  React.useEffect(() => {
    let timer;
    if (lockoutTimer > 0) {
      timer = setTimeout(() => setLockoutTimer(lockoutTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [lockoutTimer]);

  // OTP resend timer effect (existing)
  React.useEffect(() => {
    let timer;
    if (otpResendTimer > 0) {
      timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpResendTimer]);

  const handleLogin = async (e) => {
    e.preventDefault()
    if (lockoutTimer > 0) return;
    console.log('Login submitted - useOTP:', useOTP, 'OTP:', otp)
    setLoading(true)

    try {
      if (!useOTP) {
        // Password login
        console.log('Attempting password login with email:', email)
        const response = await authAPI.login({ email, password })
        console.log('Password login response:', response.data)
        setToken(response.data.access_token)
        // Fetch user info to get role
        const userInfo = await authAPI.getMe(response.data.access_token)
        setUser(userInfo.data)
        localStorage.setItem('user_email', userInfo.data.email)
        // Store user_id for chat UI
        if (userInfo.data.id) {
          localStorage.setItem('user_id', String(userInfo.data.id));
          console.log('[Login DEBUG] user_id set in localStorage:', userInfo.data.id);
        } else if (userInfo.data.user_id) {
          localStorage.setItem('user_id', String(userInfo.data.user_id));
          console.log('[Login DEBUG] user_id set in localStorage:', userInfo.data.user_id);
        } else {
          console.warn('[Login DEBUG] No user_id found in userInfo.data:', userInfo.data);
        }
        // Always ensure backend public key matches localStorage
        let publicKey = localStorage.getItem('publicKey');
        let secretKey = localStorage.getItem('secretKey');
        // If either key is missing, try to restore/generate
        if (!publicKey || !secretKey) {
          // Try to get from profile
          const profileRes = await profilesAPI.getAll();
          const myProfile = profileRes.data.find(u => u.email === userInfo.data.email);
          if (myProfile && myProfile.public_key) {
            localStorage.setItem('publicKey', myProfile.public_key);
            publicKey = myProfile.public_key;
            // If secretKey is missing, force generate new keypair and update profile
            if (!secretKey) {
              const keypair = encryptionService.generateKeyPair();
              publicKey = encryptionService.getPublicKey(keypair);
              secretKey = encryptionService.getSecretKey(keypair);
              localStorage.setItem('publicKey', publicKey);
              localStorage.setItem('secretKey', secretKey);
            }
          } else {
            // Generate new keypair and update profile
            const keypair = encryptionService.generateKeyPair();
            publicKey = encryptionService.getPublicKey(keypair);
            secretKey = encryptionService.getSecretKey(keypair);
            localStorage.setItem('publicKey', publicKey);
            localStorage.setItem('secretKey', secretKey);
          }
        }
        // Always update backend with local publicKey after login
        try {
          await profilesAPI.update({ public_key: localStorage.getItem('publicKey') });
        } catch (e) {
          console.error('Failed to update backend public key:', e);
        }
        // Always check and warn if secretKey is still missing
        if (!localStorage.getItem('secretKey')) {
          toast.error('Encryption key setup failed. You will not be able to decrypt old messages. A new keypair has been generated. Share your new public key with contacts if needed.')
        }
        toast.success('Logged in successfully!')
        const role = userInfo.data.role?.toLowerCase()
        if (role === 'admin') {
          navigate('/admin')
        } else if (role === 'recruiter') {
          navigate('/company-admin/dashboard')
        } else {
          navigate('/')
        }
      } else {
        // OTP verification
        if (otp.length !== 6) {
          toast.error('Please enter a valid 6-digit OTP')
          return
        }
        console.log('Attempting OTP verification with email:', email, 'OTP:', otp)
        const response = await authAPI.verifyOTP(email, otp)
        console.log('OTP verification response:', response.data)
        setToken(response.data.access_token)
        // Fetch user info to get role
        const userInfo = await authAPI.getMe(response.data.access_token)
        setUser(userInfo.data)
        localStorage.setItem('user_email', userInfo.data.email)
        toast.success('Verified with OTP!')
        if (userInfo.data.role === 'ADMIN') {
          navigate('/admin')
        } else {
          navigate('/')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response?.data)
      // Handle lockout (429)
      if (error.response?.status === 429) {
        // Backend message: 'Too many failed login attempts. Try again after X minutes.'
        const detailMsg = error.response?.data?.detail || 'Too many failed login attempts. Try again later.';
        setLockoutMessage(detailMsg);
        // Try to extract the number of minutes from the backend message
        let minutes = 10; // default
        const match = detailMsg.match(/after (\d+) minute/);
        if (match && match[1]) {
          minutes = parseInt(match[1], 10);
        }
        setLockoutTimer(minutes * 60);
        toast.error(detailMsg);
      } else {
        const errorMsg = error.response?.data?.detail || error.message || 'Login failed'
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOTP = async () => {
    if (!email) {
      toast.error('Please enter your email first')
      return
    }
    if (otpResendTimer > 0) return;
    console.log('Requesting OTP for email:', email)
    try {
      const response = await authAPI.requestOTP(email)
      console.log('OTP request response:', response.data)
      setUseOTP(true)
      setOTP('')
      setOtpResendTimer(60);
      toast.success('OTP sent to your email! Please check your inbox.')
    } catch (error) {
      console.error('OTP request error:', error)
      console.error('Error response:', error.response?.data)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to request OTP'
      toast.error(errorMsg)
    }
  }

  const handleOTPComplete = (otpValue) => {
    console.log('OTP completed:', otpValue)
    setOTP(otpValue)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">FCS</h1>
        <p className="text-center text-gray-600 mb-8 text-sm">Secure Job Portal</p>

        {lockoutTimer > 0 && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-center">
            <div>Too many failed login attempts.</div>
            <div className="font-bold mt-1">Try again in {Math.floor(lockoutTimer / 60)}:{String(lockoutTimer % 60).padStart(2, '0')}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={lockoutTimer > 0}
            />
          </div>

          {!useOTP ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={lockoutTimer > 0}
              />
            </div>
          ) : (
            <div>
              <VirtualKeyboard onComplete={handleOTPComplete} length={6} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (useOTP && otp.length !== 6) || lockoutTimer > 0}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading...' : useOTP ? 'Verify OTP' : 'Login'}
          </button>

          {useOTP && (
            <button
              type="button"
              onClick={() => {
                setUseOTP(false)
                setOTP('')
                setPassword('')
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
              disabled={lockoutTimer > 0}
            >
              Back to Password Login
            </button>
          )}

          {!useOTP && (
            <button
              type="button"
              onClick={handleRequestOTP}
              disabled={otpResendTimer > 0 || lockoutTimer > 0}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {otpResendTimer > 0 ? `Use OTP Instead (${otpResendTimer}s)` : 'Use OTP Instead (Secure)'}
            </button>
          )}
        </form>

        <div className="flex flex-col gap-2 mt-4">
          <button
            type="button"
            className="text-blue-500 hover:underline text-sm"
            onClick={() => setShowForgot(true)}
            disabled={lockoutTimer > 0}
          >
            Forgot Password?
          </button>
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-500 hover:underline">
              Register here
            </a>
          </p>
        </div>
        <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
      </div>
    </div>
  )
}
