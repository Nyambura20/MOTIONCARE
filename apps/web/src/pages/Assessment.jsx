import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, Upload, MessageSquare, Send, Loader2, Image as ImageIcon, Video, Play, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Wifi, WifiOff, Sparkles, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { analyzeInjuryImage, generateFocusImages } from '../services/imageAnalysisService'
import { initializeChat, sendMessage, generateExercisePlan } from '../services/chatbotService'
import { analyzeExerciseForm } from '../services/exerciseFeedbackService'
import SkeletonVisualization from '../components/SkeletonVisualization'

export default function Assessment() {
  const { user, markOnboardingComplete } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isNewUser = user?.isNewUser || false
  
  // Load saved state from localStorage (but clear it for new users)
  const loadSavedState = () => {
    // Check if this is a new user by looking at the user object directly
    const authStorage = localStorage.getItem('motioncare-auth-storage');
    let isUserNew = false;
    
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        isUserNew = parsed?.state?.user?.isNewUser || false;
      } catch (e) {
        console.error('Error parsing auth storage:', e);
      }
    }
    
    // Clear saved state ONLY for new users on first visit (when welcome flag is present)
    // Do NOT clear for authenticated users reloading the page
    if (location.state?.welcome && isUserNew) {
      console.log('🆕 New signup detected - clearing saved state');
      localStorage.removeItem('motioncare-assessment-state')
      return null
    }
    
    // For authenticated users (including returning users), load saved state
    try {
      const saved = localStorage.getItem('motioncare-assessment-state')
      if (saved) {
        const parsedState = JSON.parse(saved)
        console.log('📂 Loading saved assessment state - Step:', parsedState.step);
        return parsedState
      }
      return null
    } catch (error) {
      console.error('Error loading saved state:', error)
      return null
    }
  }

  const savedState = loadSavedState()
  
  const [step, setStep] = useState(savedState?.step || 'upload') // upload | chat | exercise | feedback
  const [injuryImage, setInjuryImage] = useState(savedState?.injuryImage || null)
  const [injuryAnalysis, setInjuryAnalysis] = useState(savedState?.injuryAnalysis || null)
  const [focusImages, setFocusImages] = useState(savedState?.focusImages || [])
  const [messages, setMessages] = useState(savedState?.messages || [])
  const [inputMessage, setInputMessage] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [chatSession, setChatSession] = useState(savedState?.chatSession || null)
  const [exerciseInstructions, setExerciseInstructions] = useState(savedState?.exerciseInstructions || null)
  const [exerciseMode, setExerciseMode] = useState(null) // 'live' | 'upload'
  const [exerciseVideo, setExerciseVideo] = useState(null)
  const [feedback, setFeedback] = useState(savedState?.feedback || null)
  const [currentWeek, setCurrentWeek] = useState(1) // Track current week in plan
  const [networkError, setNetworkError] = useState(null)
  const [poseLandmarksHistory, setPoseLandmarksHistory] = useState([]) // Store pose data for analysis
  const [showWelcome, setShowWelcome] = useState(false) // Welcome modal for new users
  
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Check if user is new and show welcome
  useEffect(() => {
    console.log(' Assessment loaded - Location state:', location.state);
    console.log(' User:', user);
    console.log(' Is new user?', isNewUser);
    
    // ONLY clear state and show welcome modal for NEW USERS on FIRST VISIT (with welcome flag)
    if (location.state?.welcome && isNewUser) {
      console.log('🎉 NEW USER DETECTED - Clearing all state and starting fresh');
      
      // Clear all saved state for new users
      localStorage.removeItem('motioncare-assessment-state')
      
      // Reset all state to initial values
      setStep('upload')
      setInjuryImage(null)
      setInjuryAnalysis(null)
      setFocusImages([])
      setMessages([])
      setChatSession(null)
      setExerciseInstructions(null)
      setExerciseMode(null)
      setExerciseVideo(null)
      setFeedback(null)
      setCurrentWeek(1)
      setPoseLandmarksHistory([])
      
      setShowWelcome(true)
      console.log(' State reset complete - showing welcome modal');
    }
    // For returning users or page reloads, state is already loaded from localStorage
    // No action needed - saved state will persist
  }, [location.state?.welcome, isNewUser]) // Only trigger when these specific values change

  // Save state to localStorage whenever key data changes
  useEffect(() => {
    const stateToSave = {
      step,
      injuryImage,
      injuryAnalysis,
      focusImages,
      messages,
      chatSession,
      exerciseInstructions,
      feedback
    }
    try {
      localStorage.setItem('motioncare-assessment-state', JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Error saving assessment state:', error)
    }
  }, [step, injuryImage, injuryAnalysis, focusImages, messages, chatSession, exerciseInstructions, feedback])

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Handle image analysis
  const handleAnalyzeImage = async (imageDataUrl) => {
    try {
      console.log(' Analyzing injury image...')
      const analysis = await analyzeInjuryImage(imageDataUrl)
      setInjuryAnalysis(analysis)
      
      console.log(' Analysis complete:', analysis)
      
      // Initialize chat session with analysis context
      console.log(' Initializing chat session...')
      const chat = initializeChat(analysis)
      setChatSession(chat)
      console.log(' Chat session initialized:', !!chat)
      
      // Add initial AI greeting to messages
      const initialMessage = `I can see you're experiencing ${analysis.injuryType} in your ${analysis.painLocation}. I'm here to help create a safe recovery plan for you.\n\nBefore we start, I have a few questions:\n1. When did this injury occur?\n2. On a scale of 1-10, what's your pain level right now?\n3. Does the pain get worse with certain movements?\n\nThis will help me recommend the most appropriate exercises for your recovery.`
      
      console.log('📨 Setting initial message:', initialMessage)
      
      setMessages([{
        role: 'assistant',
        text: initialMessage
      }])
      
      return analysis
    } catch (error) {
      console.error(' Error analyzing image:', error)
      
      // Detect network errors
      if (!navigator.onLine || error.message.includes('fetch') || error.message.includes('network')) {
        setNetworkError('Unable to connect to AI service. Please check your internet connection and try again.')
      } else {
        setNetworkError(`Analysis failed: ${error.message}. Please try again.`)
      }
      throw error
    }
  }

  // Generate exercise plan from chat conversation
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true)
    try {
      // Generate exercise plan
      const plan = await generateExercisePlan(chatSession, messages)
      setExerciseInstructions(plan)
      
      // Generate focus images with better error handling
      if (injuryAnalysis) {
        console.log(' Starting focus image generation...')
        console.log(' Pain location:', injuryAnalysis.painLocation)
        console.log(' Injury type:', injuryAnalysis.injuryType)
        
        try {
          const images = await generateFocusImages(
            injuryAnalysis.painLocation,
            injuryAnalysis.injuryType
          )
          
          console.log(' Focus images received:', images)
          console.log(' Image 1 type:', typeof images.image1)
          console.log(' Image 1 starts with:', images.image1?.substring(0, 30))
          console.log(' Image 2 type:', typeof images.image2)
          console.log(' Image 2 starts with:', images.image2?.substring(0, 30))
          
          // Validate images are actual base64 or URLs
          const validImages = []
          if (images.image1 && typeof images.image1 === 'string' && 
              (images.image1.startsWith('data:image') || images.image1.startsWith('http'))) {
            validImages.push(images.image1)
          }
          if (images.image2 && typeof images.image2 === 'string' && 
              (images.image2.startsWith('data:image') || images.image2.startsWith('http'))) {
            validImages.push(images.image2)
          }
          
          console.log(' Valid images found:', validImages.length)
          setFocusImages(validImages.length > 0 ? validImages : [])
        } catch (imageError) {
          console.error(' Focus image generation failed:', imageError)
          setFocusImages([]) // Set empty array on error
        }
      }
      
      // Move to exercise step
      setStep('exercise')
    } catch (error) {
      console.error(' Error generating plan:', error)
      console.error(' Error message:', error.message)
      console.error(' Error stack:', error.stack)
      alert(`Failed to generate exercise plan: ${error.message}\n\nPlease check the console for details and try again.`)
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  // Analyze exercise video/recording
  const handleAnalyzeExercise = async (poseLandmarksHistory) => {
    if (!exerciseVideo && exerciseMode !== 'live') return
    
    console.log(' Starting exercise analysis...')
    console.log(' Pose data frames:', poseLandmarksHistory?.length || 0)
    console.log(' Exercise plan:', exerciseInstructions ? 'Available' : 'Missing')
    console.log(' Injury:', injuryAnalysis?.injuryType, 'at', injuryAnalysis?.painLocation)
    
    // Move to feedback step and show loading
    setStep('feedback')
    setFeedback(null) // Clear previous feedback first
    setIsAnalyzing(true)
    
    // Add small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      console.log(' Analyzing exercise form with pose data...')
      
      const analysis = await analyzeExerciseForm(poseLandmarksHistory, exerciseInstructions, injuryAnalysis)
      
      console.log(' Exercise analysis complete:', analysis)
      console.log('📈 Score:', analysis.overallScore)
      console.log('💪 Strengths:', analysis.strengths?.length || 0)
      console.log(' Improvements:', analysis.improvements?.length || 0)
      
      setFeedback(analysis)
    } catch (error) {
      console.error(' Error analyzing exercise:', error)
      console.error(' Error details:', error.message, error.stack)
      
      // User-friendly error handling
      setFeedback({
        overallScore: 0,
        error: true,
        networkIssue: !navigator.onLine,
        strengths: [],
        improvements: [
          !navigator.onLine 
            ? '❌ No internet connection. Please check your network and try again.'
            : '❌ Analysis failed. Please try again.'
        ],
        safetyChecks: [
          'Ensure you have a stable internet connection',
          'Make sure the video was recorded properly'
        ],
        encouragement: 'Technical issues happen - let\'s try again!',
        nextSteps: 'Record your exercise again when ready.'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      {/* Welcome Modal for New Users */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-2xl w-full border border-gray-700 shadow-2xl">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Welcome to MotionCare AI!</h2>
                <p className="text-gray-400 text-lg">Your personalized rehabilitation journey starts here</p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-3 flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">1. Upload Your Injury Photo</h3>
                    <p className="text-gray-400 text-sm">Our AI will analyze your injury and create a personalized assessment</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-500/10 rounded-lg p-3 flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">2. Chat with AI Clinician</h3>
                    <p className="text-gray-400 text-sm">Discuss your symptoms and goals to refine your recovery plan</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-green-500/10 rounded-lg p-3 flex-shrink-0">
                    <Video className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">3. Perform Exercise Video</h3>
                    <p className="text-gray-400 text-sm">Record or live stream your exercise for biomechanical analysis</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-purple-500/10 rounded-lg p-3 flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">4. Get Detailed Feedback</h3>
                    <p className="text-gray-400 text-sm">Receive AI-powered form analysis with improvement tips</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowWelcome(false)
                    markOnboardingComplete()
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Get Started
                </button>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm inline-flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <StepIndicator number={1} label="Upload Photo" active={step === 'upload'} completed={!!injuryImage} />
            <div className="flex-1 h-0.5 bg-gray-700 mx-2"></div>
            <StepIndicator number={2} label="AI Chat" active={step === 'chat'} completed={step === 'exercise' || step === 'feedback'} />
            <div className="flex-1 h-0.5 bg-gray-700 mx-2"></div>
            <StepIndicator number={3} label="Exercise" active={step === 'exercise'} completed={step === 'feedback'} />
            <div className="flex-1 h-0.5 bg-gray-700 mx-2"></div>
            <StepIndicator number={4} label="Feedback" active={step === 'feedback'} completed={!!feedback} />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          {/* STEP 1: Upload Photo */}
          {step === 'upload' && (
            <UploadPhotoStep 
              injuryImage={injuryImage}
              setInjuryImage={setInjuryImage}
              fileInputRef={fileInputRef}
              onContinue={() => setStep('chat')}
              onAnalyze={handleAnalyzeImage}
            />
          )}

          {/* STEP 2: AI Chat */}
          {step === 'chat' && (
            <ChatStep 
              injuryAnalysis={injuryAnalysis}
              messages={messages}
              setMessages={setMessages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              chatSession={chatSession}
              messagesEndRef={messagesEndRef}
              onGeneratePlan={handleGeneratePlan}
              isGeneratingPlan={isGeneratingPlan}
            />
          )}

          {/* STEP 3: Do Exercise */}
          {step === 'exercise' && (
            <ExerciseStep 
              exerciseInstructions={exerciseInstructions}
              focusImages={focusImages}
              exerciseMode={exerciseMode}
              setExerciseMode={setExerciseMode}
              exerciseVideo={exerciseVideo}
              setExerciseVideo={setExerciseVideo}
              videoInputRef={videoInputRef}
              onAnalyzeExercise={handleAnalyzeExercise}
            />
          )}

          {/* STEP 4: AI Feedback */}
          {step === 'feedback' && (
            <FeedbackStep 
              feedback={feedback}
              exerciseVideo={exerciseVideo}
              injuryAnalysis={injuryAnalysis}
              exerciseInstructions={exerciseInstructions}
              onRestart={() => {
                setStep('upload')
                setInjuryImage(null)
                setInjuryAnalysis(null)
                setFocusImages([])
                setMessages([])
                setChatSession(null)
                setExerciseInstructions(null)
                setExerciseMode(null)
                setExerciseVideo(null)
                setFeedback(null)
                // Clear saved state from localStorage
                localStorage.removeItem('motioncare-assessment-state')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Step Indicator Component
function StepIndicator({ number, label, active, completed }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 transition-all ${
        completed ? 'bg-green-500 text-white' :
        active ? 'bg-primary text-white ring-4 ring-primary/20' :
        'bg-gray-700 text-gray-400'
      }`}>
        {completed ? <CheckCircle2 className="w-6 h-6" /> : number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}

// STEP 1: Upload Photo
function UploadPhotoStep({ injuryImage, setInjuryImage, fileInputRef, onContinue, onAnalyze }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setInjuryImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleContinue = async () => {
    setIsAnalyzing(true)
    try {
      await onAnalyze(injuryImage)
      onContinue()
    } catch (error) {
      console.error('Failed to analyze image:', error)
      alert('Failed to analyze image. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Upload Your Injury Photo</h2>
            <p className="text-gray-400 text-sm">AI will analyze your condition</p>
          </div>
        </div>

        {!injuryImage ? (
          <div className="bg-gray-700/30 border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-primary/50 transition-all">
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-primary hover:bg-primaryDark text-white rounded-lg font-semibold transition-all inline-flex items-center gap-2 mb-3"
            >
              <Camera className="w-5 h-5" />
              Choose Photo
            </button>
            <p className="text-gray-500 text-xs">
              Supports JPG, PNG, HEIC
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-700/30 rounded-xl p-4 border border-gray-600">
              <img 
                src={injuryImage} 
                alt="Injury" 
                className="w-full h-48 object-cover rounded-lg" 
              />
              <button
                onClick={() => setInjuryImage(null)}
                className="absolute top-6 right-6 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium shadow-lg"
                disabled={isAnalyzing}
              >
                Remove
              </button>
            </div>
            
            <button
              onClick={handleContinue}
              disabled={isAnalyzing}
              className="w-full px-6 py-3 bg-primary hover:bg-primaryDark text-white rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Continue to AI Chat
                  <MessageSquare className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// STEP 2: Chat with AI
function ChatStep({ injuryAnalysis, messages, setMessages, inputMessage, setInputMessage, isAnalyzing, setIsAnalyzing, chatSession, messagesEndRef, onGeneratePlan, isGeneratingPlan }) {
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAnalyzing) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    
    setIsAnalyzing(true)
    try {
      console.log(' Sending message:', userMessage)
      console.log(' Chat session exists:', !!chatSession)
      
      // Get AI response
      const aiResponse = await sendMessage(chatSession, userMessage)
      
      console.log(' AI response received:', aiResponse)
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', text: aiResponse }])
    } catch (error) {
      console.error(' Chat error:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // User-friendly error messages
      let friendlyMessage = '';
      
      if (!navigator.onLine) {
        friendlyMessage = `🔌 **Connection Lost**\n\nIt looks like you're not connected to the internet. Please check your WiFi or mobile data and try again.\n\n💡 **Tip:** Make sure you have a stable internet connection to use the AI assistant.`;
      } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        friendlyMessage = `📡 **Network Issue**\n\nI'm having trouble connecting to the AI service. This might be due to:\n\n• Slow or unstable internet connection\n• Server temporarily unavailable\n• Firewall or security settings\n\n💡 **Try:** Wait a few seconds and send your message again.`;
      } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        friendlyMessage = `⚙️ **Service Temporarily Down**\n\nThe AI service is experiencing technical difficulties. Don't worry, this is temporary!\n\n💡 **What to do:** Please try again in a few moments. Your information is saved.`;
      } else if (error.message.includes('401') || error.message.includes('403')) {
        friendlyMessage = `🔐 **Authentication Issue**\n\nThere's a problem verifying your access. This usually happens when:\n\n• Your session has expired\n• API credentials need refreshing\n\n💡 **Solution:** Try logging out and back in.`;
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        friendlyMessage = `⏱️ **Too Many Requests**\n\nWe've received a lot of requests. Please wait a moment before trying again.\n\n💡 **Tip:** Take a short break and we'll be ready for you!`;
      } else {
        friendlyMessage = `😕 **Something Went Wrong**\n\nI encountered an unexpected issue while processing your message.\n\n💡 **What to do:**\n• Check your internet connection\n• Try sending your message again\n• If the problem continues, try refreshing the page\n\nYour conversation is saved and won't be lost.`;
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: friendlyMessage
      }])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-2">Chat with AI Assistant</h2>
        <p className="text-gray-400">
          Tell me about your pain, symptoms, and recovery goals.
        </p>
        {injuryAnalysis && (
          <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>Detected:</strong> {injuryAnalysis.injuryType} in {injuryAnalysis.painLocation}
            </p>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-gray-700 text-gray-100'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">AI Assistant</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-gray-300">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-gray-700">
        <div className="flex gap-2 items-end">
          {/* Attachment button */}
          <button
            className="px-3 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-all"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message AI assistant..."
              disabled={isAnalyzing}
              rows={1}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          {/* Voice input button */}
          <button
            className="px-3 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-all"
            title="Voice input"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isAnalyzing}
            className="px-4 py-3 bg-primary hover:bg-primaryDark text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">AI can make mistakes. Check important info.</p>
          {/* Show Generate Plan button only after at least 2 user responses (5 total messages: 1 AI greeting + 2 pairs of user/AI) */}
          {messages.filter(m => m.role === 'user').length >= 2 && (
            <button
              onClick={onGeneratePlan}
              disabled={isGeneratingPlan || isAnalyzing}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Exercise Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// STEP 3: Exercise (placeholder)
// STEP 3: Exercise (placeholder)
function ExerciseStep({ exerciseInstructions, focusImages, exerciseMode, setExerciseMode, exerciseVideo, setExerciseVideo, videoInputRef, onAnalyzeExercise }) {
  const [countdown, setCountdown] = useState(null)
  const [poseLandmarks, setPoseLandmarks] = useState(null) // Shared pose landmarks state
  const [poseLandmarksHistory, setPoseLandmarksHistory] = useState([]) // Store all pose frames
  const [currentWeek, setCurrentWeek] = useState(1) // Week navigation
  const [videoAnalysisComplete, setVideoAnalysisComplete] = useState(false) // Track video completion
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  
  // Track pose landmarks over time for analysis
  const handlePoseLandmarksUpdate = (landmarks) => {
    setPoseLandmarks(landmarks)
    if (landmarks) {
      setPoseLandmarksHistory(prev => [...prev, {
        timestamp: Date.now(),
        landmarks: landmarks
      }])
    }
  }
  
  const handleStartLive = () => {
    setExerciseMode('live')
    setCountdown(3)
  }

  const handleUploadVideo = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert('Video file is too large. Please upload a video under 50MB.')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setExerciseVideo(reader.result)
        setExerciseMode('upload')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFinishExercise = async () => {
    if ((exerciseVideo || exerciseMode === 'live') && poseLandmarksHistory.length > 0) {
      // Analyze and the handler will move to feedback step
      await onAnalyzeExercise(poseLandmarksHistory)
    } else if (!poseLandmarksHistory || poseLandmarksHistory.length === 0) {
      // No pose data - show error
      await onAnalyzeExercise([])
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-4">Do Your Exercise</h2>
      
      {/* Exercise Instructions */}
      {exerciseInstructions && (
        <div className="mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">Your Rehabilitation Plan</h3>
          </div>
          
          {exerciseInstructions.weeklyPlan?.filter(week => week.week === currentWeek).map((week, weekIdx) => (
            <div key={weekIdx} className="">
              <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-sm text-primary font-semibold">📌 {week.progressionNotes}</p>
              </div>
              
              <div className="space-y-4">
                {week.exercises?.map((exercise, idx) => (
                  <div key={idx} className="p-5 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-gray-500 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <h5 className="text-lg font-semibold text-white">{exercise.name}</h5>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold border border-green-500/30">
                        Exercise {idx + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      <strong className="text-primary">Sets:</strong> {exercise.sets} | 
                      <strong className="text-primary ml-3">Reps:</strong> {exercise.reps} | 
                      <strong className="text-primary ml-3">Duration:</strong> {exercise.duration}
                    </p>
                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">{exercise.instructions}</p>
                    {exercise.focusPoints && exercise.focusPoints.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                        <p className="text-xs text-blue-300 font-semibold mb-2">✨ Focus Points:</p>
                        <ul className="list-disc list-inside text-xs text-blue-200 space-y-1">
                          {exercise.focusPoints.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                      </div>
                    )}
                    {exercise.safetyTips && exercise.safetyTips.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                        <p className="text-xs text-yellow-300 font-semibold mb-2">⚠️ Safety Tips:</p>
                        <ul className="list-disc list-inside text-xs text-yellow-200 space-y-1">
                          {exercise.safetyTips.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {exerciseInstructions.overallGuidance && currentWeek === 1 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
              <p className="text-sm text-blue-200">📊 <strong>Overall Guidance:</strong> {exerciseInstructions.overallGuidance}</p>
            </div>
          )}
        </div>
      )}

      {/* Focus Images - Always show section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-3">🎯 Key Areas to Focus On</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(focusImages && focusImages.length > 0 ? focusImages : [null, null]).map((img, idx) => {
            const isValidImage = img && typeof img === 'string' && (img.startsWith('http') || img.startsWith('data:image'));
            
            return (
              <div key={idx} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                {isValidImage ? (
                  <img 
                    src={img} 
                    alt={`Focus area ${idx + 1}`} 
                    className="w-full h-64 object-contain rounded-lg bg-gray-800"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-600"
                  style={{ display: isValidImage ? 'none' : 'flex' }}
                >
                  <div className="text-center px-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-white font-semibold mb-2">Focus Area {idx + 1}</p>
                    <p className="text-gray-400 text-sm">
                      {idx === 0 ? 'Maintain proper form and alignment' : 'Control movement speed and range'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode Selection */}
      {!exerciseMode && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleStartLive}
            className="p-6 bg-gradient-to-br from-primary to-purple-600 hover:from-primaryDark hover:to-purple-700 rounded-2xl transition-all group"
          >
            <Video className="w-10 h-10 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">Live Exercise</h3>
            <p className="text-sm text-white/80">Use your webcam with real-time pose detection</p>
          </button>

          <div>
            <input 
              ref={videoInputRef}
              type="file" 
              accept="video/*" 
              onChange={handleUploadVideo}
              className="hidden"
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              className="w-full h-full p-6 bg-gradient-to-br from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-2xl transition-all group"
            >
              <Upload className="w-10 h-10 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Upload Video</h3>
              <p className="text-sm text-white/80">Upload exercise video (max 30s)</p>
            </button>
          </div>
        </div>
      )}

      {/* Live Exercise Mode */}
      {exerciseMode === 'live' && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                Live Exercise Session
              </h3>
              <p className="text-sm text-gray-400 mt-1">Real-time pose detection & analysis</p>
            </div>
            <button
              onClick={() => setExerciseMode(null)}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600 text-white rounded-lg text-sm backdrop-blur-sm border border-gray-600 transition-all"
            >
              Change Mode
            </button>
          </div>
          
          {/* Split Screen Layout - Premium Design */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left: Live Webcam with Glass Effect */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30">
                <span className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Your Exercise
                </span>
                <span className="text-xs text-gray-400">Live Feed</span>
              </div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500/30 bg-black" style={{ height: '480px' }}>
                <LiveExerciseComponent 
                  countdown={countdown}
                  setCountdown={setCountdown}
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isRecording={isRecording}
                  setIsRecording={setIsRecording}
                  setExerciseVideo={setExerciseVideo}
                  mediaRecorderRef={mediaRecorderRef}
                  recordedChunksRef={recordedChunksRef}
                  setPoseLandmarks={handlePoseLandmarksUpdate}
                />
              </div>
            </div>
            
            {/* Right: 3D Skeleton with Neon Effect */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-green-600/20 rounded-lg border border-cyan-500/30">
                <span className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                  </svg>
                  AI Skeleton Analysis
                </span>
                {poseLandmarks && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                    Active
                  </span>
                )}
              </div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-cyan-500/30 bg-gray-900" style={{ height: '480px' }}>
                <SkeletonCanvas poseLandmarks={poseLandmarks} />
                {/* Corner Stats */}
                {poseLandmarks && (
                  <div className="absolute top-4 right-4 px-3 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-cyan-500/30">
                    <div className="text-xs text-cyan-300 font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>{poseLandmarks.length} Points</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Live Stats and Feedback Button */}
          <div className="mt-6 space-y-4">
            {/* Real-time Stats */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-cyan-400">{poseLandmarksHistory.length}</div>
                  <div className="text-xs text-gray-400">Frames Captured</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {poseLandmarksHistory.length > 0 
                      ? ((poseLandmarksHistory[poseLandmarksHistory.length - 1]?.timestamp - poseLandmarksHistory[0]?.timestamp) / 1000).toFixed(1)
                      : '0.0'
                    }s
                  </div>
                  <div className="text-xs text-gray-400">Duration</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {poseLandmarks ? 'Active' : 'Waiting'}
                  </div>
                  <div className="text-xs text-gray-400">Pose Detection</div>
                </div>
              </div>
            </div>

            {/* Get AI Feedback Button - Shows when enough pose data collected */}
            {poseLandmarksHistory.length > 10 && (
              <button
                onClick={handleFinishExercise}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-6 h-6" />
                Get AI Feedback on Your Form
              </button>
            )}

            {poseLandmarksHistory.length <= 10 && poseLandmarksHistory.length > 0 && (
              <div className="text-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-400 text-sm">
                  ⏱️ Perform exercise for a few more seconds... ({poseLandmarksHistory.length}/10 frames minimum)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Video Mode */}
      {exerciseMode === 'upload' && exerciseVideo && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                Video Analysis
              </h3>
              <p className="text-sm text-gray-400 mt-1">AI-powered movement assessment</p>
            </div>
            <button
              onClick={() => {
                setExerciseMode(null)
                setExerciseVideo(null)
                setPoseLandmarks(null)
              }}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600 text-white rounded-lg text-sm backdrop-blur-sm border border-gray-600 transition-all"
            >
              Upload Different Video
            </button>
          </div>
          
          {/* Split Screen Layout - Premium Design */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left: Video Playback with Cinematic Frame */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-lg border border-blue-500/30">
                <span className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Your Performance
                </span>
                <span className="text-xs text-gray-400">Video Playback</span>
              </div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500/30 bg-black" style={{ height: '480px' }}>
                <VideoPlaybackComponent 
                  videoSrc={exerciseVideo}
                  canvasRef={canvasRef}
                  setPoseLandmarks={handlePoseLandmarksUpdate}
                  onVideoComplete={() => {
                    console.log(' Video analysis complete!');
                    setVideoAnalysisComplete(true);
                  }}
                />
              </div>
            </div>
            
            {/* Right: 3D Skeleton with Advanced Visualization */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-lg border border-emerald-500/30">
                <span className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  3D Pose Tracking
                </span>
                {poseLandmarks && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                      Tracking Active
                    </span>
                  </div>
                )}
              </div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500/30 bg-gray-900" style={{ height: '480px' }}>
                <SkeletonCanvas poseLandmarks={poseLandmarks} />
                {/* Real-time Stats Overlay */}
                {poseLandmarks && (
                  <div className="absolute bottom-4 left-4 right-4 px-4 py-3 bg-black/70 backdrop-blur-md rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-emerald-300">
                        <span className="font-semibold">{poseLandmarks.length}</span> tracking points detected
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        AI Processing
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Get AI Feedback Button - Shows when pose data is collected */}
          {poseLandmarksHistory.length > 10 && (
            <div className="mt-6">
              <button
                onClick={handleFinishExercise}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-6 h-6" />
                Get AI Feedback on Your Form
              </button>
              <p className="text-center text-gray-400 text-sm mt-3">
                ✅ {poseLandmarksHistory.length} frames analyzed! Click to get detailed feedback.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Live Exercise Component with MediaPipe Pose Detection
function LiveExerciseComponent({ countdown, setCountdown, videoRef, canvasRef, isRecording, setIsRecording, setExerciseVideo, mediaRecorderRef, recordedChunksRef, setPoseLandmarks }) {
  const [poseDetector, setPoseDetector] = useState(null)
  const [webcamStarted, setWebcamStarted] = useState(false)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    if (countdown === null) return
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      startWebcam()
    }
  }, [countdown])

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setWebcamStarted(true)
        
        // Initialize MediaPipe Pose (we'll load it dynamically)
        loadPoseDetection()
      }
    } catch (error) {
      console.error('Error accessing webcam:', error)
      
      // User-friendly error messages
      let errorMessage = 'Could not access webcam.'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No webcam detected. Please connect a camera or use "Upload Video" mode instead.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Webcam is already in use by another application. Please close other apps using the camera.'
      }
      
      alert(errorMessage)
      setCountdown(null) // Reset countdown
    }
  }

  const loadPoseDetection = async () => {
    try {
      const { Pose } = await import('@mediapipe/pose')
      
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
      })
      
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })
      
      pose.onResults(onPoseResults)
      setPoseDetector(pose)
      
      detectPose(pose)
    } catch (error) {
      console.error('Error loading pose detection:', error)
      // Fallback to simple drawing
      detectPose(null)
    }
  }

  const onPoseResults = (results) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx || !results) return
    
    // Update skeleton component with pose landmarks
    if (results.poseLandmarks) {
      setPoseLandmarks(results.poseLandmarks)
      console.log(' Live pose detected with', results.poseLandmarks.length, 'landmarks')
    }
    
    // Draw ONLY the clean video frame (no skeleton overlay)
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const detectPose = async (pose) => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const processFrame = async () => {
      if (video.readyState >= 2 && pose) {
        try {
          await pose.send({ image: video })
        } catch (error) {
          console.error('Error processing frame:', error)
        }
      } else if (video.readyState >= 2) {
        // Fallback: just draw video without pose detection
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#00FF00'
        ctx.font = '16px Arial'
        ctx.fillText('📹 Camera Active', 10, 30)
      }
      
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }

    processFrame()
  }

  const startRecording = () => {
    const canvas = canvasRef.current
    const stream = canvas.captureStream(30) // 30 FPS
    
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    })
    
    recordedChunksRef.current = []
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }
    
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const reader = new FileReader()
      reader.onloadend = () => {
        setExerciseVideo(reader.result)
      }
      reader.readAsDataURL(blob)
    }
    
    mediaRecorderRef.current.start()
    setIsRecording(true)
    
    // Auto-stop after 30 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording()
      }
    }, 30000)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Stop webcam
      const stream = videoRef.current?.srcObject
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      const stream = videoRef.current?.srcObject
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="relative w-full" style={{ minHeight: '480px' }}>
      {countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-center">
            <div className="text-8xl font-bold text-primary mb-4">{countdown}</div>
            <p className="text-xl text-white">Get ready...</p>
          </div>
        </div>
      )}
      
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: '480px' }}>
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ display: 'block', maxWidth: '100%', minHeight: '480px', objectFit: 'contain', backgroundColor: '#000' }}
        />
        
        {webcamStarted && (
          <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-white text-sm font-medium">
                {isRecording ? 'Recording...' : 'Ready'}
              </span>
            </div>
          </div>
        )}
      </div>

      {webcamStarted && !isRecording && (
        <button
          onClick={startRecording}
          className="w-full mt-4 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-2"
        >
          <div className="w-4 h-4 rounded-full bg-white" />
          Start Recording (Max 30s)
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="w-full mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold"
        >
          Stop Recording
        </button>
      )}
    </div>
  )
}

// Video Playback Component with Pose Detection
function VideoPlaybackComponent({ videoSrc, canvasRef, setPoseLandmarks, onVideoComplete }) {
  const videoRef = useRef(null)
  const thumbnailCanvasRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [poseDetector, setPoseDetector] = useState(null)
  const [isLoadingPose, setIsLoadingPose] = useState(true)
  const [showThumbnail, setShowThumbnail] = useState(true)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
    
    // Load MediaPipe Pose
    loadPoseDetector()
  }, [videoSrc])

  // DON'T auto-start for uploaded videos - let user click play button
  // Auto-play is only enabled for live mode

  const loadPoseDetector = async () => {
    try {
      setIsLoadingPose(true)
      const { Pose } = await import('@mediapipe/pose')
      const { Camera } = await import('@mediapipe/camera_utils')
      
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
      })
      
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })
      
      pose.onResults(onPoseResults)
      
      // Wait a bit for WASM to initialize
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setPoseDetector(pose)
      setIsLoadingPose(false)
    } catch (error) {
      console.error(' Error loading MediaPipe Pose:', error)
      console.error(' Error stack:', error.stack)
      setIsLoadingPose(false)
    }
  }

  const onPoseResults = (results) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx || !results) return
    
    // Update skeleton component with pose landmarks
    if (results.poseLandmarks) {
      setPoseLandmarks(results.poseLandmarks)
      console.log(' Pose detected with', results.poseLandmarks.length, 'landmarks')
    } else {
      console.log(' No pose detected in frame')
    }
    
    // Draw ONLY the clean video frame (no skeleton overlay)
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    }
    ctx.restore()
  }



  const handlePlay = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !poseDetector) {
      console.warn(' Video, canvas, or pose detector not ready')
      return
    }

    // Wait for video metadata to load
    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Hide thumbnail and show playback canvas
    setShowThumbnail(false)
    
    // Reset video to start
    video.currentTime = 0
    video.play()
    setIsPlaying(true)
    
    // Start pose detection loop
    detectPoseInVideo()
  }

  const detectPoseInVideo = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (!video || !poseDetector || !canvas) {
      console.warn('Video, canvas, or pose detector not ready')
      return
    }

    const ctx = canvas.getContext('2d')

    const processFrame = async () => {
      if (video.paused || video.ended) {
        setIsPlaying(false)
        return
      }
      
      if (video.readyState >= 2) {
        try {
          // First draw the video frame manually as fallback
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Then try pose detection (will redraw with skeleton if successful)
          await poseDetector.send({ image: video })
        } catch (error) {
          console.error('Error processing frame:', error)
          // Even if pose detection fails, keep showing video
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }
    
    processFrame()
  }

  const handlePause = () => {
    videoRef.current?.pause()
    setIsPlaying(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (poseDetector) {
        poseDetector.close()
      }
    }
  }, [poseDetector])

  const handleVideoEnded = () => {
    setIsPlaying(false)
    setShowThumbnail(true)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    // Notify parent component that video analysis is complete
    if (onVideoComplete) {
      onVideoComplete()
    }
  }

  const generateThumbnail = (video) => {
    const canvas = thumbnailCanvasRef.current
    if (!canvas || !video) return
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoSrc}
        className="hidden"
        onEnded={handleVideoEnded}
        onLoadedMetadata={(e) => {
          const video = e.target
          const canvas = canvasRef.current
          const thumbCanvas = thumbnailCanvasRef.current
          if (canvas) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          if (thumbCanvas) {
            thumbCanvas.width = video.videoWidth
            thumbCanvas.height = video.videoHeight
          }
        }}
        onLoadedData={(e) => {
          // Generate thumbnail when video data is ready
          generateThumbnail(e.target)
        }}
        preload="metadata"
      />
      
      {/* Loading state while pose detector initializes */}
      {showThumbnail && isLoadingPose && (
        <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
          <canvas
            ref={thumbnailCanvasRef}
            className="w-full h-auto"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
            <p className="text-white font-semibold">Initializing AI Analysis...</p>
            <p className="text-gray-400 text-sm mt-1">Please wait</p>
          </div>
        </div>
      )}
      
      {/* Main playback canvas */}
      <div className={`relative bg-black rounded-xl overflow-hidden ${showThumbnail ? 'hidden' : ''}`} style={{ minHeight: '400px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
        />
      </div>
      
      {(!poseDetector || isLoadingPose) && (
        <div className="absolute top-4 left-4 bg-yellow-500/80 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span className="text-white text-sm font-medium">
              {isLoadingPose ? 'Loading pose detector...' : 'Initializing...'}
            </span>
          </div>
        </div>
      )}
      
      <div className="mt-4 flex gap-3">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={!poseDetector || isLoadingPose}
            className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {isLoadingPose ? 'Loading...' : 'Play with Pose Detection'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold"
          >
            Pause
          </button>
        )}
      </div>
    </div>
  )
}

// STEP 4: Feedback
function FeedbackStep({ feedback, exerciseVideo, injuryAnalysis, exerciseInstructions, onRestart }) {
  // Function to download feedback as text report
  const downloadFeedbackReport = () => {
    const exercise = exerciseInstructions?.weeklyPlan?.[0]?.exercises?.[0];
    const reportContent = `
MOTIONCARE AI - EXERCISE FEEDBACK REPORT
${'='.repeat(50)}

Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

${'='.repeat(50)}
INJURY INFORMATION
${'='.repeat(50)}
Injury Type: ${injuryAnalysis?.injuryType || 'N/A'}
Pain Location: ${injuryAnalysis?.painLocation || 'N/A'}
Severity: ${injuryAnalysis?.severity || 'N/A'}

${'='.repeat(50)}
EXERCISE PERFORMED
${'='.repeat(50)}
Exercise Name: ${exercise?.name || 'N/A'}
Sets: ${exercise?.sets || 'N/A'}
Reps: ${exercise?.reps || 'N/A'}
Duration: ${exercise?.duration || 'N/A'}

Instructions:
${exercise?.instructions || 'N/A'}

Focus Points:
${exercise?.focusPoints?.map((point, i) => `${i + 1}. ${point}`).join('\n') || 'N/A'}

${'='.repeat(50)}
PERFORMANCE ANALYSIS
${'='.repeat(50)}
Overall Score: ${feedback.overallScore}%

${feedback.wasCorrectExercise !== undefined ? `Exercise Verification: ${feedback.wasCorrectExercise ? '✓ Correct exercise performed' : '✗ Different exercise detected'}\nDetected Exercise: ${feedback.exercisePerformed || 'Unknown'}\n\n` : ''}${feedback.specificFeedback ? `AI Analysis:\n${feedback.specificFeedback}\n\n` : ''}STRENGTHS:
${feedback.strengths?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None recorded'}

AREAS FOR IMPROVEMENT:
${feedback.improvements?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None recorded'}

SAFETY OBSERVATIONS:
${feedback.safetyChecks?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None recorded'}

${'='.repeat(50)}
FORM BREAKDOWN
${'='.repeat(50)}
${feedback.formAnalysis ? `Range of Motion: ${feedback.formAnalysis.rangeOfMotion || 'N/A'}\n\nControl & Stability: ${feedback.formAnalysis.controlAndStability || 'N/A'}\n\nAlignment & Posture: ${feedback.formAnalysis.alignmentAndPosture || 'N/A'}\n\nTiming: ${feedback.formAnalysis.timing || 'N/A'}\n` : 'Not available'}
${'='.repeat(50)}
DETAILED METRICS
${'='.repeat(50)}
${feedback.detailedMetrics ? `Frames Analyzed: ${feedback.detailedMetrics.frames}\nDuration: ${feedback.detailedMetrics.duration}s\nPose Visibility: ${feedback.detailedMetrics.avgVisibility}%\nBody Stability: ${feedback.detailedMetrics.bodyStability}\n\n${feedback.detailedMetrics.kneeRange ? `Knee Range: ${feedback.detailedMetrics.kneeRange.min.toFixed(0)}° - ${feedback.detailedMetrics.kneeRange.max.toFixed(0)}° (avg: ${feedback.detailedMetrics.kneeRange.avg.toFixed(0)}°)\n` : ''}${feedback.detailedMetrics.elbowRange ? `Elbow Range: ${feedback.detailedMetrics.elbowRange.min.toFixed(0)}° - ${feedback.detailedMetrics.elbowRange.max.toFixed(0)}° (avg: ${feedback.detailedMetrics.elbowRange.avg.toFixed(0)}°)\n` : ''}${feedback.detailedMetrics.hipRange ? `Hip Range: ${feedback.detailedMetrics.hipRange.min.toFixed(0)}° - ${feedback.detailedMetrics.hipRange.max.toFixed(0)}° (avg: ${feedback.detailedMetrics.hipRange.avg.toFixed(0)}°)\n` : ''}` : 'Metrics not available'}
${'='.repeat(50)}
RECOMMENDATIONS
${'='.repeat(50)}
Encouragement: ${feedback.encouragement || 'Keep up the good work!'}

Next Steps: ${feedback.nextSteps || 'Continue with your rehabilitation plan.'}

${'='.repeat(50)}
Generated by MotionCare AI
Powered by Gemini 2.5 Pro & MediaPipe Pose Detection
${'='.repeat(50)}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MotionCare_Feedback_${new Date().toISOString().split('T')[0]}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!feedback) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-400">Loading feedback...</p>
      </div>
    );
  }

  // Handle error state
  if (feedback.error) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {feedback.networkIssue ? <WifiOff className="w-10 h-10 text-red-400" /> : <AlertCircle className="w-10 h-10 text-red-400" />}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {feedback.networkIssue ? 'Connection Issue' : 'Analysis Error'}
            </h2>
            <p className="text-gray-400">
              {feedback.networkIssue 
                ? 'Unable to connect to analysis service'
                : 'We encountered an issue analyzing your exercise'
              }
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                What Happened
              </h3>
              <ul className="space-y-2">
                {feedback.improvements?.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-3">What to Try</h3>
              <ul className="space-y-2">
                {feedback.safetyChecks?.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300">
                    <span className="text-blue-400 mt-1">✓</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={onRestart}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primaryDark text-white rounded-xl font-semibold transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            feedback.overallScore >= 70 ? 'bg-green-500/10' : 'bg-yellow-500/10'
          }`}>
            <CheckCircle2 className={`w-10 h-10 ${
              feedback.overallScore >= 70 ? 'text-green-400' : 'text-yellow-400'
            }`} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Exercise Analysis Complete!</h2>
          <p className="text-gray-400">AI-powered biomechanical assessment</p>
        </div>

        <div className="space-y-6">
          {/* Overall Score with details */}
          <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-6 text-center">
            <div className="text-7xl font-bold text-white mb-2">{feedback.overallScore}%</div>
            <p className="text-white/90 text-lg mb-4">Overall Performance Score</p>
            {feedback.detailedMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{feedback.detailedMetrics.frames}</div>
                  <div className="text-xs text-white/70">Frames Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{feedback.detailedMetrics.duration}s</div>
                  <div className="text-xs text-white/70">Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{feedback.detailedMetrics.avgVisibility}%</div>
                  <div className="text-xs text-white/70">Visibility</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{(parseFloat(feedback.detailedMetrics.bodyStability) * 100).toFixed(1)}</div>
                  <div className="text-xs text-white/70">Stability Score</div>
                </div>
              </div>
            )}
          </div>

          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                What You Did Well
              </h3>
              <ul className="space-y-3">
                {feedback.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300 bg-green-900/10 p-3 rounded-lg">
                    <span className="text-green-400 mt-1 text-lg">✓</span>
                    <span className="flex-1">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements && feedback.improvements.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-orange-500/30">
              <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Areas for Improvement
              </h3>
              <ul className="space-y-3">
                {feedback.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300 bg-orange-900/10 p-3 rounded-lg">
                    <span className="text-orange-400 mt-1 text-lg">→</span>
                    <span className="flex-1">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Safety Checks */}
          {feedback.safetyChecks && feedback.safetyChecks.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-blue-500/30">
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Safety Observations
              </h3>
              <ul className="space-y-3">
                {feedback.safetyChecks.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300 bg-blue-900/10 p-3 rounded-lg">
                    <span className="text-blue-400 mt-1 text-lg">⚠</span>
                    <span className="flex-1">{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Specific Feedback - Detailed Analysis */}
          {feedback.specificFeedback && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-primary/30">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Detailed AI Analysis
              </h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">{feedback.specificFeedback}</p>
            </div>
          )}

          {/* Form Analysis Breakdown */}
          {feedback.formAnalysis && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Form Analysis Breakdown</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {feedback.formAnalysis.rangeOfMotion && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-purple-400 mb-2">Range of Motion</h4>
                    <p className="text-gray-300 text-sm">{feedback.formAnalysis.rangeOfMotion}</p>
                  </div>
                )}
                {feedback.formAnalysis.controlAndStability && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-blue-400 mb-2">Control & Stability</h4>
                    <p className="text-gray-300 text-sm">{feedback.formAnalysis.controlAndStability}</p>
                  </div>
                )}
                {feedback.formAnalysis.alignmentAndPosture && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-green-400 mb-2">Alignment & Posture</h4>
                    <p className="text-gray-300 text-sm">{feedback.formAnalysis.alignmentAndPosture}</p>
                  </div>
                )}
                {feedback.formAnalysis.timing && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-orange-400 mb-2">Timing</h4>
                    <p className="text-gray-300 text-sm">{feedback.formAnalysis.timing}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exercise Correctness Check */}
          {feedback.wasCorrectExercise !== undefined && (
            <div className={`rounded-xl p-6 border ${
              feedback.wasCorrectExercise 
                ? 'bg-green-900/20 border-green-500/30' 
                : 'bg-yellow-900/20 border-yellow-500/30'
            }`}>
              <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${
                feedback.wasCorrectExercise ? 'text-green-400' : 'text-yellow-400'
              }`}>
                <CheckCircle2 className="w-6 h-6" />
                Exercise Verification
              </h3>
              <p className="text-gray-300">
                {feedback.wasCorrectExercise 
                  ? `✅ You correctly performed: ${feedback.exercisePerformed || 'the prescribed exercise'}`
                  : `⚠️ Expected exercise not detected. It appears you performed: ${feedback.exercisePerformed || 'a different movement'}`
                }
              </p>
            </div>
          )}

          {/* Encouragement */}
          {feedback.encouragement && (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center border border-purple-400/30">
              <p className="text-white text-xl font-semibold italic">"{feedback.encouragement}"</p>
            </div>
          )}

          {/* Next Steps */}
          {feedback.nextSteps && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <ChevronRight className="w-6 h-6 text-primary" />
                Next Steps
              </h3>
              <p className="text-gray-300 leading-relaxed">{feedback.nextSteps}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={onRestart}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-primary via-purple-600 to-primary hover:from-primaryDark hover:via-purple-700 hover:to-primaryDark text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02]"
          >
            Start New Assessment
          </button>
          <button
            onClick={downloadFeedbackReport}
            className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Feedback Report
          </button>
        </div>
      </div>
    </div>
  )
}

// Skeleton Canvas Component - Displays 3D skeleton based on pose landmarks
function SkeletonCanvas({ poseLandmarks }) {
  const skeletonCanvasRef = useRef(null)
  const [qualityScore, setQualityScore] = useState(0)

  const drawSkeleton = (landmarks) => {
    const canvas = skeletonCanvasRef.current
    if (!canvas || !landmarks) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Enhanced gradient background with depth
    const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height)
    bgGradient.addColorStop(0, '#1a237e')
    bgGradient.addColorStop(0.5, '#0d1428')
    bgGradient.addColorStop(1, '#020308')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Dynamic grid lines with perspective
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.08)'
    ctx.lineWidth = 1
    const gridSize = 50
    for (let x = 0; x < width; x += gridSize) {
      ctx.globalAlpha = 0.1 + (Math.sin(x / 100) * 0.05)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.globalAlpha = 0.1 + (Math.sin(y / 100) * 0.05)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Calculate pose quality score based on visibility
    const visibleLandmarks = landmarks.filter(l => l && l.visibility > 0.5).length
    const quality = Math.round((visibleLandmarks / landmarks.length) * 100)
    setQualityScore(quality)

    // Enhanced skeleton connections with color coding
    const connections = [
      // Torso (cyan) - Core stability
      { start: 11, end: 12, color: '#00F5FF', width: 14, label: 'core' },
      { start: 11, end: 23, color: '#00E5FF', width: 12, label: 'core' },
      { start: 12, end: 24, color: '#00E5FF', width: 12, label: 'core' },
      { start: 23, end: 24, color: '#00D5FF', width: 12, label: 'core' },
      
      // Left arm (neon green) - Movement
      { start: 11, end: 13, color: '#39FF14', width: 11, label: 'left_arm' },
      { start: 13, end: 15, color: '#00FF00', width: 10, label: 'left_arm' },
      { start: 15, end: 17, color: '#00DD00', width: 8, label: 'left_hand' },
      
      // Right arm (lime/yellow) - Movement
      { start: 12, end: 14, color: '#CCFF00', width: 11, label: 'right_arm' },
      { start: 14, end: 16, color: '#FFFF00', width: 10, label: 'right_arm' },
      { start: 16, end: 18, color: '#FFE600', width: 8, label: 'right_hand' },
      
      // Left leg (orange) - Support
      { start: 23, end: 25, color: '#FF9500', width: 13, label: 'left_leg' },
      { start: 25, end: 27, color: '#FF8000', width: 12, label: 'left_leg' },
      { start: 27, end: 29, color: '#FF6B00', width: 7, label: 'left_foot' },
      
      // Right leg (red-orange) - Support
      { start: 24, end: 26, color: '#FF4500', width: 13, label: 'right_leg' },
      { start: 26, end: 28, color: '#FF3000', width: 12, label: 'right_leg' },
      { start: 28, end: 30, color: '#FF1500', width: 7, label: 'right_foot' }
    ]

    // Outer glow effect for depth
    connections.forEach(({ start, end, color, width: lineWidth }) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      if (!startPoint || !endPoint || startPoint.visibility < 0.3 || endPoint.visibility < 0.3) return

      // Outer glow
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth + 10
      ctx.globalAlpha = 0.15
      ctx.lineCap = 'round'
      ctx.shadowBlur = 20
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.moveTo(startPoint.x * width, startPoint.y * height)
      ctx.lineTo(endPoint.x * width, endPoint.y * height)
      ctx.stroke()
    })

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1

    // Main connections with gradient
    connections.forEach(({ start, end, color, width: lineWidth }) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      if (!startPoint || !endPoint || startPoint.visibility < 0.3 || endPoint.visibility < 0.3) return

      const gradient = ctx.createLinearGradient(
        startPoint.x * width, startPoint.y * height,
        endPoint.x * width, endPoint.y * height
      )
      gradient.addColorStop(0, color)
      gradient.addColorStop(0.5, '#FFFFFF')
      gradient.addColorStop(1, color)

      ctx.strokeStyle = gradient
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(startPoint.x * width, startPoint.y * height)
      ctx.lineTo(endPoint.x * width, endPoint.y * height)
      ctx.stroke()
    })

    ctx.globalAlpha = 1

    // Enhanced joints with pulsing effect
    const importantJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    const jointColors = {
      11: '#00F5FF', 12: '#00F5FF', // Shoulders
      13: '#39FF14', 14: '#CCFF00', // Elbows
      15: '#00FF00', 16: '#FFFF00', // Wrists
      23: '#00D5FF', 24: '#00D5FF', // Hips
      25: '#FF9500', 26: '#FF4500', // Knees
      27: '#FF8000', 28: '#FF3000', // Ankles
    }

    landmarks.forEach((landmark, index) => {
      if (!landmark || landmark.visibility < 0.3) return

      const x = landmark.x * width
      const y = landmark.y * height
      const isImportant = importantJoints.includes(index)
      const radius = isImportant ? 16 : 10
      const jointColor = jointColors[index] || '#4B9EFF'

      // Pulsing glow
      const pulseIntensity = 0.5 + Math.sin(Date.now() / 500) * 0.3
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
      glowGrad.addColorStop(0, `${jointColor}${Math.round(pulseIntensity * 255).toString(16)}`)
      glowGrad.addColorStop(0.4, `${jointColor}40`)
      glowGrad.addColorStop(1, `${jointColor}00`)
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(x, y, radius * 3, 0, 2 * Math.PI)
      ctx.fill()

      // Core sphere
      const coreGrad = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      coreGrad.addColorStop(0, '#FFFFFF')
      coreGrad.addColorStop(0.6, jointColor)
      coreGrad.addColorStop(1, '#000000')
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()

      // Ring outline
      ctx.strokeStyle = isImportant ? '#FFFFFF' : jointColor
      ctx.lineWidth = isImportant ? 4 : 2
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.globalAlpha = 1
    })

    // Status HUD overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, width, 60)
    
    // Quality bar
    const barWidth = 200
    const barHeight = 8
    const barX = 20
    const barY = 35
    
    // Background bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(barX, barY, barWidth, barHeight)
    
    // Quality fill with gradient
    const qualityGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0)
    qualityGrad.addColorStop(0, '#FF4500')
    qualityGrad.addColorStop(0.5, '#FFFF00')
    qualityGrad.addColorStop(1, '#00FF00')
    ctx.fillStyle = qualityGrad
    ctx.fillRect(barX, barY, (barWidth * quality) / 100, barHeight)
    
    // Text overlay
    ctx.fillStyle = '#00FF00'
    ctx.font = 'bold 18px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('🎯 POSE LOCKED', 20, 25)
    
    ctx.fillStyle = quality > 80 ? '#00FF00' : quality > 50 ? '#FFFF00' : '#FF4500'
    ctx.font = 'bold 14px "Courier New", monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`Quality: ${quality}%`, width - 20, 25)
    
    ctx.fillStyle = '#00D5FF'
    ctx.font = '11px "Courier New", monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${visibleLandmarks}/${landmarks.length} points tracked`, width - 20, 42)
  }

  useEffect(() => {
    if (poseLandmarks) {
      const animate = () => {
        drawSkeleton(poseLandmarks)
      }
      const animationId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationId)
    }
  }, [poseLandmarks])

  return (
    <div className="relative w-full flex items-center justify-center rounded-xl overflow-hidden" style={{ minHeight: '500px', height: '100%' }}>
      <canvas
        ref={skeletonCanvasRef}
        width={600}
        height={800}
        className="w-full h-auto"
        style={{ maxHeight: '100%', objectFit: 'contain' }}
      />
      {!poseLandmarks && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/95 via-blue-900/95 to-purple-900/95">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ color: '#4B9EFF' }}></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ color: '#00F5FF' }}></path>
                </svg>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full animate-ping"></div>
              </div>
            </div>
            <div>
              <p className="text-2xl text-white font-bold mb-2">Analyzing Movement</p>
              <p className="text-sm text-gray-400">AI is processing your pose...</p>
              <div className="mt-4 flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
