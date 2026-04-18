import React, { useState } from 'react'

/**
 * Virtual Keyboard for OTP Input
 * Prevents keylogging attacks by using mouse/touch input only
 * No keyboard events are used
 */
export default function VirtualKeyboard({ onComplete, length = 6 }) {
  const [otp, setOTP] = useState('')
  const [error, setError] = useState('')

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

  const handleDigitClick = (digit) => {
    if (otp.length < length) {
      const newOTP = otp + digit
      setOTP(newOTP)

      if (newOTP.length === length) {
        onComplete(newOTP)
      }
    }
  }

  const handleBackspace = () => {
    setOTP(otp.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    setOTP('')
    setError('')
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* OTP Display */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Enter OTP
        </label>
        <div className="flex gap-2 justify-center">
          {Array(length).fill(0).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition ${
                otp[i] ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              {otp[i] ? '•' : ''}
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <p className="text-gray-600 text-sm text-center">
          {otp.length} / {length}
          {otp.length === length && (
            <span className="ml-2 text-green-600 font-semibold">✅ Ready to verify</span>
          )}
        </p>
      </div>

      {/* Virtual Keyboard */}
      <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
        <p className="text-xs text-gray-600 mb-3 text-center font-semibold">
          🔒 Virtual Keyboard (Keylogging Protection)
        </p>

        {/* Digit Grid */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {digits.map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigitClick(digit)}
              disabled={otp.length >= length}
              className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg font-bold text-lg hover:bg-blue-500 hover:text-white hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {digit}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleBackspace}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm transition"
          >
            ← Backspace
          </button>
          <button
            onClick={handleClear}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg text-sm transition"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-sm text-blue-700">
        <p className="font-semibold">🔐 Security Note</p>
        <p>This virtual keyboard protects against keylogging by using mouse clicks instead of keyboard input.</p>
      </div>
    </div>
  )
}
