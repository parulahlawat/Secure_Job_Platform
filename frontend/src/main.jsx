import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('🚀 React mounting...')

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

console.log('✅ React mounted successfully')
