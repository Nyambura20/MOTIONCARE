import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showNewSignupMessage, setShowNewSignupMessage] = useState(false)
  const login = useAuthStore((s) => s.login)
  const signup = useAuthStore((s) => s.signup)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check if user just signed up
    if (location.state?.newSignup) {
      setShowNewSignupMessage(true)
      setEmail(location.state.email || '')
      
      // Clear message after 5 seconds
      setTimeout(() => setShowNewSignupMessage(false), 5000)
    }
  }, [location])

  const onSubmit = (e) => {
    e.preventDefault()
    
    // Check if this is a new signup completion
    const pendingSignup = localStorage.getItem('motioncare-pending-signup')
    let user
    
    if (pendingSignup) {
      const signupData = JSON.parse(pendingSignup)
      
      // Verify email matches
      if (signupData.email === email) {
        // This is a new user completing signup→login flow
        user = { 
          id: 'patient_' + Date.now(), 
          email: signupData.email, 
          name: signupData.name,
          role: 'patient',
          isNewUser: true, // Mark as new user for welcome modal
          createdAt: signupData.timestamp
        }
        signup(user) // Use signup to set isNewUser flag
        localStorage.removeItem('motioncare-pending-signup')
        console.log(' New user completed signup→login flow:', email);
      } else {
        // Different email - treat as returning user
        user = { 
          id: 'patient_' + Date.now(), 
          email, 
          name: email.split('@')[0],
          role: 'patient',
          isNewUser: false
        }
        login(user)
        console.log(' Returning user logged in:', email);
      }
    } else {
      // Returning user
      user = { 
        id: 'patient_' + Date.now(), 
        email, 
        name: email.split('@')[0],
        role: 'patient',
        isNewUser: false
      }
      login(user)
      console.log(' Returning user logged in:', email);
    }
    
    window.scrollTo(0, 0)
    // If this was a new signup completing the signup->login flow,
    // pass a welcome flag so Assessment shows the welcome modal and
    // clears any previous saved state for new users.
    if (user.isNewUser) {
      navigate('/assessment', { state: { welcome: true } })
    } else {
      navigate('/assessment')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6">
      {/* New Signup Success Message */}
      {showNewSignupMessage && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-semibold">Account Created Successfully!</p>
            <p className="text-sm text-white/90">Please login to continue</p>
          </div>
        </div>
      )}
      
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primaryDark rounded-2xl mb-4 shadow-2xl">
            <span className="text-white text-3xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            {showNewSignupMessage ? 'Complete Your Signup' : 'Welcome Back!'}
          </h1>
          <p className="text-gray-400">
            {showNewSignupMessage ? 'Login to start your recovery journey' : 'Continue your recovery journey'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
              <input 
                type="email"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input 
                type="password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 text-primary rounded" />
                <span className="text-sm text-gray-400">Remember me</span>
              </label>
              <a href="#forgot" className="text-sm text-primary hover:underline">Forgot password?</a>
            </div>
            
            <button type="submit" className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primaryDark hover:from-primaryDark hover:to-primary text-white font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 group">
              Sign in
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              New to MotionCare? <Link to="/signup" className="text-primary hover:underline font-semibold inline-flex items-center gap-1">
                Create account <Sparkles className="w-4 h-4" />
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
