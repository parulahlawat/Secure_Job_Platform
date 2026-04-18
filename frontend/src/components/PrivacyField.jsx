import React, { useState } from 'react'

/**
 * Profile field with privacy controls
 * User can set visibility: public / connections / private
 */
export default function PrivacyField({ 
  label, 
  value, 
  onChange, 
  privacy = 'public',
  onPrivacyChange,
  type = 'text',
  multiline = false
}) {
  // Always use a defined value for controlled input
  const safeValue = value ?? "";
  const privacyOptions = [
    { value: 'public', label: '🌍 Public', color: 'blue' },
    { value: 'connections', label: '👥 Connections', color: 'purple' },
    { value: 'private', label: '🔒 Private', color: 'red' }
  ]

  const privacyIcons = {
    public: '🌍',
    connections: '👥',
    private: '🔒'
  }

  return (
    <div className="space-y-2 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex gap-2">
          {privacyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onPrivacyChange(option.value)}
              title={option.label}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                privacy === option.value
                  ? `bg-${option.color}-500 text-white`
                  : `bg-gray-100 text-gray-600 hover:bg-gray-200`
              }`}
            >
              {privacyIcons[option.value]}
            </button>
          ))}
        </div>
      </div>

      {multiline ? (
        <textarea
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          rows="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      ) : (
        <input
          type={type}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      )}

      <p className="text-xs text-gray-500 italic">
        Visibility: {privacyOptions.find(o => o.value === privacy)?.label}
      </p>
    </div>
  )
}
