import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, MessageSquare, Dumbbell, LineChart, Sparkles, Upload, Video, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Home() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // If user is logged in, redirect to assessment
  React.useEffect(() => {
    if (user) {
      navigate('/assessment')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section - Only show when NOT logged in */}
      {!user && (
        <section className="pt-20 pb-32 px-6">
          <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Injury Recovery</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Recover Smarter with<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
              AI Rehabilitation
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Upload a photo of your injury, chat with AI, get personalized exercises, 
            and receive real-time feedback on your form. All powered by advanced AI.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link 
              to="/signup"
              className="px-8 py-4 bg-primary hover:bg-primaryDark text-white rounded-xl text-lg font-semibold transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Start Free Assessment
            </Link>
            <Link 
              to="/login"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-lg font-semibold transition-all border border-gray-700"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center mb-16 text-lg">
            Simple, fast, and powered by AI
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <div className="text-primary text-sm font-bold mb-2">STEP 1</div>
              <h3 className="text-xl font-bold text-white mb-3">Upload Photo</h3>
              <p className="text-gray-400 text-sm">
                Take a photo of your injury or where you feel pain. Our AI will analyze it.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-purple-400" />
              </div>
              <div className="text-purple-400 text-sm font-bold mb-2">STEP 2</div>
              <h3 className="text-xl font-bold text-white mb-3">Chat with AI</h3>
              <p className="text-gray-400 text-sm">
                Answer questions about your pain, range of motion, and goals. AI analyzes everything.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Dumbbell className="w-7 h-7 text-green-400" />
              </div>
              <div className="text-green-400 text-sm font-bold mb-2">STEP 3</div>
              <h3 className="text-xl font-bold text-white mb-3">Do Exercises</h3>
              <p className="text-gray-400 text-sm">
                Get custom exercises with AI-generated focus images. Do them live or upload video.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6">
                <LineChart className="w-7 h-7 text-orange-400" />
              </div>
              <div className="text-orange-400 text-sm font-bold mb-2">STEP 4</div>
              <h3 className="text-xl font-bold text-white mb-3">Get Feedback</h3>
              <p className="text-gray-400 text-sm">
                AI analyzes your form and gives personalized suggestions to improve recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Powered by Advanced AI
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Vision Analysis</h3>
              <p className="text-gray-400 text-sm">
                Gemini Vision analyzes your injury photos and generates focus point images
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Exercise Tracking</h3>
              <p className="text-gray-400 text-sm">
                Real-time pose detection or video upload (max 30 seconds)
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart Feedback</h3>
              <p className="text-gray-400 text-sm">
                AI analyzes your technique and provides improvement suggestions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Only show when NOT logged in */}
      {!user && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-purple-600 rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Start Your Recovery Today
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Free to use • No credit card required • HIPAA compliant
          </p>
          <Link 
            to="/signup"
            className="inline-block px-10 py-4 bg-white text-primary rounded-xl text-lg font-bold hover:bg-gray-100 transition-all shadow-xl"
          >
            Begin Free Assessment →
          </Link>
        </div>
      </section>
      )}
    </div>
  )
}
