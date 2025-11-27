import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

import { 
  analyzeInjuryFlow, 
  chatFlow, 
  generateExercisePlanFlow, 
  analyzeExerciseFormWithPoseFlow 
} from './genkit-flows.js';

import { generateFocusImages } from './imagen-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.options('*', cors());

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'public')));
}

const auth = new GoogleAuth({
  keyFilename: path.join(__dirname, '..', 'vertex-ai-key.json'),
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const PROJECT_ID = process.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0891331347';
const LOCATION = process.env.VITE_GOOGLE_CLOUD_LOCATION || 'us-central1';

/**
 * Generate exercise demonstration video/image using Vertex AI Imagen.
 * Note: Currently generates static images as Vertex AI doesn't support video generation.
 */
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, exerciseId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log('Video generation request for:', exerciseId);
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }
    
    console.log('Authentication successful');
    
    
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagegeneration@006:predict`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          negativePrompt: 'blurry, low quality, distorted, cartoon, text overlay',
          guidanceScale: 15
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI error:', errorText);
      throw new Error(`Vertex AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.predictions && data.predictions[0]) {
      console.log('Image generated successfully');
      
      res.json({
        success: true,
        imageData: data.predictions[0].bytesBase64Encoded,
        mimeType: 'image/png',
        message: 'Note: Vertex AI Imagen generates images. For video, consider using other services.'
      });
    } else {
      throw new Error('No prediction data in response');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate anatomical focus images for injury visualization using Vertex AI Imagen 3.0.
 */
app.post('/api/generate-images', async (req, res) => {
  try {
    const { painLocation, injuryType } = req.body;
    
    if (!painLocation || !injuryType) {
      return res.status(400).json({ error: 'painLocation and injuryType are required' });
    }
    
    console.log('Generating focus images for:', painLocation, '-', injuryType);
    
    const result = await generateFocusImages(painLocation, injuryType);
    
    console.log('Focus images generated');
    
    res.json({
      success: true,
      image1: result.image1,
      image2: result.image2
    });
    
  } catch (error) {
    console.error('Error generating focus images:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      image1: 'placeholder_focus1',
      image2: 'placeholder_focus2'
    });
  }
});

/**
 * Health check endpoint for monitoring server status.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MotionCare Vertex AI Server',
    timestamp: new Date().toISOString()
  });
});

/**
 * Test Vertex AI authentication and credentials.
 */
app.get('/api/test-auth', async (req, res) => {
  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    res.json({
      success: true,
      hasToken: !!accessToken.token,
      projectId: PROJECT_ID,
      location: LOCATION
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Analyze injury image using Genkit + Vertex AI Vision.
 */
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageDataUrl } = req.body;
    if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl is required' });

    console.log(' Analyzing injury image with Genkit + Vertex AI...');

    // Extract mime type from data URL
    const mimeMatch = imageDataUrl.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    // Use Genkit flow with Vertex AI
    const analysis = await analyzeInjuryFlow({ imageDataUrl, mimeType });

    console.log('Analysis complete:', analysis);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('/api/analyze-image error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      analysis: {
        body_part: 'unspecified structure (analysis failed)',
        painLocation: 'unspecified structure',
        injuryType: 'General discomfort',
        severity: 'moderate',
        recommendations: ['Consult a healthcare professional', 'Apply ice if swelling present', 'Rest the affected area'],
      },
    });
  }
});

/**
 * Conversational AI chat endpoint using Genkit + Vertex AI.
 * Supports turn-based conversation with injury context.
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, history, injuryContext } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    console.log('Received chat request');
    console.log('Prompt:', prompt.substring(0, 100));
    console.log('History length:', history?.length || 0);
    
    // Convert history format for Genkit
    const chatHistory = Array.isArray(history) ? history
      .filter(h => {
        if (!h.text || h.role === 'system') return false;
        return h.role === 'user' || h.role === 'assistant' || h.role === 'model';
      })
      .map(h => ({
        role: h.role === 'assistant' ? 'model' : h.role,
        parts: [{ text: String(h.text) }]
      })) : [];

    const cleanInjuryContext = injuryContext ? {
      injuryType: String(injuryContext.injuryType || 'unspecified'),
      painLocation: String(injuryContext.painLocation || 'unspecified area'),
      severity: String(injuryContext.severity || 'moderate'),
    } : undefined;

    // Use Genkit flow with Vertex AI
    const result = await chatFlow({
      message: String(prompt),
      history: chatHistory,
      injuryContext: cleanInjuryContext
    });

    console.log('Chat response generated via Genkit + Vertex AI');
    res.json({ success: true, text: result.response });
  } catch (error) {
    console.error('/api/chat error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate personalized 4-week exercise plan using Genkit + Vertex AI.
 */
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { injuryType, painLocation, conversationSummary } = req.body;
    if (!injuryType || !painLocation) {
      return res.status(400).json({ error: 'injuryType and painLocation are required' });
    }

    console.log('Generating exercise plan via Genkit + Vertex AI');
    console.log('Injury:', injuryType, 'at', painLocation);

    // Use Genkit flow with Vertex AI
    const result = await generateExercisePlanFlow({
      injuryType: String(injuryType),
      painLocation: String(painLocation),
      conversationSummary: String(conversationSummary || 'Patient needs rehabilitation exercises')
    });

    console.log('Exercise plan generated via Genkit + Vertex AI');
    res.json({ success: true, plan: result });
  } catch (error) {
    console.error('/api/generate-plan error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze exercise form using Genkit + Vertex AI with MediaPipe pose data.
 */
app.post('/api/analyze-exercise-form', async (req, res) => {
  try {
    const { poseMetrics, exercisePlan, injuryAnalysis } = req.body;
    
    if (!poseMetrics || !exercisePlan) {
      return res.status(400).json({ error: 'poseMetrics and exercisePlan are required' });
    }

    console.log('Analyzing exercise form with Genkit + Vertex AI');
    console.log('Frames analyzed:', poseMetrics.frames);
    console.log('Exercise:', poseMetrics.exerciseName);
    console.log('Injury:', injuryAnalysis?.injuryType, 'at', injuryAnalysis?.painLocation);

    // Use Genkit flow with Vertex AI for pose-based analysis
    const analysis = await analyzeExerciseFormWithPoseFlow({
      poseMetrics,
      exercisePlan: exercisePlan.weeklyPlan?.[0]?.exercises?.[0] || { name: poseMetrics.exerciseName },
      injuryAnalysis
    });

    console.log('Exercise form analysis complete via Genkit + Vertex AI - Score:', analysis.overallScore);
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('/api/analyze-exercise-form error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      analysis: {
        overallScore: 0,
        error: true,
        improvements: ['Analysis failed. Please try again.'],
        strengths: [],
        safetyChecks: ['Ensure proper form', 'Stop if you feel pain'],
        encouragement: 'Keep trying!',
        nextSteps: 'Try the exercise again with better lighting.'
      }
    });
  }
});

// Serve frontend for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Vertex AI Server running on http://localhost:${PORT}`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Location: ${LOCATION}`);
  console.log(`\nTest endpoints:`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Auth Test: http://localhost:${PORT}/api/test-auth`);
});

export default app;
