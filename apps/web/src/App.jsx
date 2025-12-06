import React, { useState } from 'react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Responsive Header */}
      <header className="sticky top-0 z-40 bg-gray-800 border-b border-gray-700 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primaryDark rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-white font-bold text-base sm:text-xl">M</span>
              </div>
              <div className="hidden xs:block">
                <h1 className="text-base sm:text-xl font-bold text-white">MotionCare AI</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">Smart Injury Recovery</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-4">
              {user ? (
                <>
                  <Link to="/assessment" className="text-sm text-gray-300 hover:text-primary transition-colors font-medium">
                    My Assessment
                  </Link>
                  <div className="text-sm text-gray-400 max-w-[120px] truncate">
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
                    Get Started
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-700">
              <nav className="flex flex-col gap-3">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm text-gray-400 bg-gray-700/50 rounded-lg">
                      👤 {user.name}
                    </div>
                    <Link 
                      to="/assessment" 
                      className="px-3 py-2 text-sm text-gray-300 hover:text-primary hover:bg-gray-700/50 rounded-lg transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Assessment
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setMobileMenuOpen(false)
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors text-left"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      className="px-3 py-2 text-sm text-gray-300 hover:text-primary hover:bg-gray-700/50 rounded-lg transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/signup"
                      className="px-3 py-2 bg-primary hover:bg-primaryDark text-white rounded-lg text-sm font-medium transition-colors text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </nav>
            </div>
          )}
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
