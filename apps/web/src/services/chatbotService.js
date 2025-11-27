/**
 * Initialize a chat session with context about the user's injury.
 * @param {Object} injuryAnalysis - Analysis results from injury image
 * @returns {Object} Chat session with history and injury context
 */
export function initializeChat(injuryAnalysis) {
  console.log('Injury analysis:', injuryAnalysis)

  const initialAssistant = `I can see you're experiencing ${injuryAnalysis?.injuryType || 'pain'} in your ${injuryAnalysis?.painLocation || 'affected area'}. I'm here to help create a safe recovery plan for you.\n\nBefore we start, I have a few questions:\n1. When did this injury occur?\n2. On a scale of 1-10, what's your pain level right now?\n3. Does the pain get worse with certain movements?\n\nThis will help me recommend the most appropriate exercises for your recovery.`

  const session = {
    history: [
      { role: 'system', text: 'You are an AI physical therapy assistant. Be empathetic, concise, and prioritize safety.' },
      { role: 'assistant', text: initialAssistant }
    ],
    injuryContext: {
      injuryType: injuryAnalysis?.injuryType || 'unspecified',
      painLocation: injuryAnalysis?.painLocation || 'unspecified area',
      severity: injuryAnalysis?.severity || 'moderate'
    }
  }

  return session
}

/**
 * Send a message to the AI chatbot via server endpoint.
 * @param {Object} chatSession - Active chat session with history
 * @param {string} message - User's message
 * @returns {Promise<string>} AI response text
 */
export async function sendMessage(chatSession, message) {
  try {
    console.log('sendMessage -> Genkit flow via /api/chat')
    console.log('Chat session:', chatSession)
    console.log('Message:', message)
    
    if (!chatSession) throw new Error('Chat session not initialized')

    chatSession.history.push({ role: 'user', text: message });

    console.log('Sending to server with injury context:', { 
      prompt: message, 
      historyLength: chatSession.history.length,
      injuryContext: chatSession.injuryContext
    });

    const resp = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: message, 
        history: chatSession.history,
        injuryContext: chatSession.injuryContext
      })
    })

    console.log('Response status:', resp.status);

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('Genkit /api/chat error:', resp.status, errText)
      throw new Error(`AI service error: ${resp.status} - ${errText}`)
    }

    const data = await resp.json()
    console.log('Response data:', data);
    
    if (!data || !data.text) throw new Error('Empty response from AI')

    chatSession.history.push({ role: 'assistant', text: data.text })

    return data.text
  } catch (error) {
    console.error('sendMessage error:', error)
    console.error('Error stack:', error.stack)
    throw error
  }
}

/**
 * Generate personalized exercise plan based on chat conversation.
 * @param {Object} chatSession - Active chat session with injury context
 * @param {Array} messages - Conversation messages (unused, kept for compatibility)
 * @returns {Promise<Object>} Structured 4-week exercise plan
 */
export async function generateExercisePlan(chatSession, messages) {
  try {
    console.log('generateExercisePlan -> using server /api/generate-plan')
    console.log('Chat session:', chatSession)
    console.log('History length:', chatSession?.history?.length || 0)
    
    if (!chatSession || !chatSession.injuryContext) {
      throw new Error('Chat session or injury context not initialized')
    }

    const conversationSummary = chatSession.history
      .filter(h => h.role === 'user' || h.role === 'assistant')
      .map(h => `${h.role}: ${h.text}`)
      .join('\n');

    console.log('Sending plan request to server...')

    const resp = await fetch('http://localhost:3001/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        injuryType: chatSession.injuryContext.injuryType,
        painLocation: chatSession.injuryContext.painLocation,
        conversationSummary: conversationSummary
      })
    })

    console.log('Plan response status:', resp.status)

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('Server /api/generate-plan error:', resp.status, errText)
      throw new Error(`AI service error: ${resp.status}`)
    }

    const data = await resp.json()
    console.log('Plan response data:', data)
    
    if (data.success && data.plan) {
      console.log('Received exercise plan:', data.plan)
      return data.plan
    }

    throw new Error('Invalid response from server')
  } catch (error) {
    console.error('generateExercisePlan error:', error)
    console.error('Error stack:', error.stack)
    throw error
  }
}
