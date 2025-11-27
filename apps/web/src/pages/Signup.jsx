import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { CheckCircle2, AlertCircle, Sparkles, Shield, Heart, Loader2 } from 'lucide-react'

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })
  const [errors, setErrors] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)
  const signup = useAuthStore((s) => s.signup)
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    // Create patient account
    const user = { 
      id: 'patient_' + Date.now(), 
      email: formData.email, 
      name: formData.name,
      role: 'patient'
    }
    
    // Show success animation
    setShowSuccess(true)
    
    setTimeout(() => {
      // Store signup data temporarily (not logged in yet)
      localStorage.setItem('motioncare-pending-signup', JSON.stringify({
        email: formData.email,
        name: formData.name,
        timestamp: Date.now()
      }))
      
      console.log(' New user registered:', formData.email);
      console.log('🔄 Redirecting to login...');
      
      // Redirect to login page - user must login to access app
      navigate('/login', { state: { newSignup: true, email: formData.email } })
    }, 1500)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-12">
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-8 max-w-md mx-4 transform animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 animate-bounce" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Account Created!</h2>
              <p className="text-white/90 text-lg">Please login to continue</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-white/80">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Redirecting to login page...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Left: Features */}
        <div className="hidden md:block space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Start Your <span className="text-primary">Recovery Journey</span>
            </h1>
            <p className="text-gray-400 text-lg">Join thousands who trust MotionCare for personalized rehabilitation</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="bg-primary/10 rounded-lg p-3 flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">AI-Powered Assessments</h3>
                <p className="text-gray-400 text-sm">Get personalized exercise plans based on your movement analysis</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="bg-blue-500/10 rounded-lg p-3 flex-shrink-0">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Expert-Guided Programs</h3>
                <p className="text-gray-400 text-sm">Follow clinician-approved rehabilitation protocols</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="bg-pink-500/10 rounded-lg p-3 flex-shrink-0">
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Progress Tracking</h3>
                <p className="text-gray-400 text-sm">Monitor your recovery with detailed analytics and insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Signup Form */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primaryDark rounded-full mb-4 shadow-lg">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">Create Your Account</h2>
            <p className="text-sm text-gray-400">Start your personalized recovery journey</p>
          </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input 
              type="text"
              name="name"
              className={`w-full px-4 py-2 bg-gray-700 border ${errors.name ? 'border-red-500' : 'border-gray-600'} rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
              value={formData.name} 
              onChange={handleChange} 
              placeholder="John Doe"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
            <input 
              type="email"
              name="email"
              className={`w-full px-4 py-2 bg-gray-700 border ${errors.email ? 'border-red-500' : 'border-gray-600'} rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
              value={formData.email} 
              onChange={handleChange} 
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input 
              type="password"
              name="password"
              className={`w-full px-4 py-2 bg-gray-700 border ${errors.password ? 'border-red-500' : 'border-gray-600'} rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
              value={formData.password} 
              onChange={handleChange} 
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
            <input 
              type="password"
              name="confirmPassword"
              className={`w-full px-4 py-2 bg-gray-700 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-600'} rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
              value={formData.confirmPassword} 
              onChange={handleChange} 
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-gray-400">
                I agree to the <a href="#terms" className="text-primary hover:underline">Terms of Service</a> and <a href="#privacy" className="text-primary hover:underline">Privacy Policy</a>
              </span>
            </label>
            {errors.agreeToTerms && <p className="text-xs text-red-400 mt-1">{errors.agreeToTerms}</p>}
          </div>
          
          <button 
            type="submit" 
            disabled={showSuccess}
            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {showSuccess ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
