import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Assessment from './pages/Assessment'

/**
 * Main application component with routing and navigation.
 */
export default function App() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Simple Header */}
      <header className="sticky top-0 z-40 bg-gray-800 border-b border-gray-700 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primaryDark rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MotionCare AI</h1>
                <p className="text-xs text-gray-400">Smart Injury Recovery</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-4">
              {user ? (
                <>
                  <Link to="/assessment" className="text-sm text-gray-300 hover:text-primary transition-colors font-medium">
                    My Assessment
                  </Link>
                  <div className="text-sm text-gray-400">
                    {user.name}
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-gray-300 hover:text-primary transition-colors font-medium">
                    Login
                  </Link>
                  <Link 
                    to="/signup"
                    className="px-4 py-2 bg-primary hover:bg-primaryDark text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Routes - Only 4 pages total! */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/assessment" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/assessment" /> : <Signup />} />
        <Route 
          path="/assessment" 
          element={user ? <Assessment /> : <Navigate to="/login" />} 
        />
        {/* Redirect all other routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} MotionCare AI. AI-Powered Injury Recovery Platform.</p>
            <p className="text-xs mt-2">HIPAA Compliant • Evidence-Based • Free to Use</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
