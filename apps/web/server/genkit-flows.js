import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PROJECT_ID = process.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0891331347';
const LOCATION = process.env.VITE_GOOGLE_CLOUD_LOCATION || 'us-central1';
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './vertex-ai-key.json';

console.log('Vertex AI Configuration:');
console.log('Project ID:', PROJECT_ID);
console.log('Location:', LOCATION);
console.log('Credentials:', CREDENTIALS_PATH);

const ai = genkit({
  plugins: [
    vertexAI({
      projectId: PROJECT_ID,
      location: LOCATION,
    }),
  ],
  enableTracingAndMetrics: true, 
});

/**
 * Genkit flow for analyzing injury images using Vertex AI Vision.
 * Identifies anatomical location, injury type, severity, and provides recommendations.
 * @param {string} imageDataUrl - Base64 encoded image data URL
 * @param {string} mimeType - Image MIME type (e.g., 'image/png')
 * @returns {Object} Structured injury analysis with body part, type, severity, and recommendations
 */
export const analyzeInjuryFlow = ai.defineFlow(
  {
    name: 'analyzeInjury',
    inputSchema: z.object({
      imageDataUrl: z.string(),
      mimeType: z.string(),
    }),
    outputSchema: z.object({
      body_part: z.string(),
      painLocation: z.string(),
      injuryType: z.string(),
      severity: z.string(),
      recommendations: z.array(z.string()),
    }),
  },
  async ({ imageDataUrl, mimeType }) => {
    console.log('Genkit Flow: Analyzing injury image...');

    const base64Data = imageDataUrl.split(',')[1] || imageDataUrl;

    const prompt = `You are a physical therapy AI assistant analyzing an injury photo.

Analyze this image and identify:
1. The EXACT anatomical structure injured (be very specific - e.g., "left lateral epicondyle of the humerus", not just "elbow")
2. Type of injury visible (sprain, strain, inflammation, fracture signs, etc.)
3. Severity assessment (mild, moderate, severe)
4. Initial rehabilitation recommendations (3-5 specific exercises or treatments)

CRITICAL: Be anatomically precise. Use proper medical terminology for body parts.

Return ONLY valid JSON with this exact structure:
{
  "body_part": "specific anatomical location",
  "painLocation": "specific anatomical location",
  "injuryType": "type of injury",
  "severity": "mild/moderate/severe",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

    const llmResponse = await ai.generate({
      model: 'vertexai/gemini-2.0-flash-exp',
      prompt: [
        { text: prompt },
        {
          media: {
            contentType: mimeType,
            url: `data:${mimeType};base64,${base64Data}`,
          },
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    let responseText = '';
    if (llmResponse.text) {
      responseText = llmResponse.text;
    } else if (llmResponse.output?.text) {
      responseText = llmResponse.output.text;
    } else if (llmResponse.message?.content) {
      // Extract text from content array
      const content = llmResponse.message.content;
      if (Array.isArray(content)) {
        responseText = content.map(c => c.text || '').join('');
      }
    }
    
    console.log('Genkit response received');
    console.log('Response structure:', JSON.stringify(llmResponse).substring(0, 300));
    console.log('Response text:', responseText.substring(0, 200));

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        body_part: parsed.body_part || parsed.painLocation,
        painLocation: parsed.painLocation || parsed.body_part,
        injuryType: parsed.injuryType,
        severity: parsed.severity,
        recommendations: parsed.recommendations || [],
      };
    }

    // Fallback if parsing fails
    return {
      body_part: 'unspecified structure',
      painLocation: 'unspecified structure',
      injuryType: 'General discomfort',
      severity: 'moderate',
      recommendations: ['Gentle stretching', 'Ice therapy', 'Rest'],
    };
  }
);

/**
 * Genkit flow for conversational AI chat with injury context.
 * Implements turn-based conversation with follow-up questions.
 * @param {string} message - User's chat message
 * @param {Array} history - Chat history with roles and messages
 * @param {Object} injuryContext - Patient's injury information
 * @returns {Object} AI response text
 */
export const chatFlow = ai.defineFlow(
  {
    name: 'injuryChat',
    inputSchema: z.object({
      message: z.string(),
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() })),
      })).optional(),
      injuryContext: z.object({
        injuryType: z.string(),
        painLocation: z.string(),
        severity: z.string().optional(),
      }).optional(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ message, history = [], injuryContext }) => {
    console.log('Genkit Flow: Processing chat message...');
    console.log('Message:', message);
    console.log('History items:', history.length);
    console.log('Injury context:', injuryContext);

    const userMessageCount = history.filter(h => h.role === 'user').length;
    console.log('User message count:', userMessageCount);

    let systemContext = injuryContext 
      ? `You are an AI physical therapy assistant helping someone with ${injuryContext.injuryType} in their ${injuryContext.painLocation}${injuryContext.severity ? ` (${injuryContext.severity} severity)` : ''}. 

Be empathetic, concise, and prioritize safety.`
      : 'You are an AI physical therapy assistant. Be empathetic and provide evidence-based rehabilitation advice.';
    
    if (userMessageCount === 1) {
      systemContext += `\n\nIMPORTANT: After acknowledging the user's response, ask 2-3 follow-up questions to gather more details:
- Have they tried any treatments (ice, heat, medication, rest)?
- What daily activities or movements are most affected?
- Any previous injuries to this area?
- What are their recovery goals?

Keep your response conversational and empathetic.`;
    } else if (userMessageCount === 2) {
      systemContext += `\n\nIMPORTANT: This is the final information gathering phase. After acknowledging their response:
1. Thank them for the information
2. Ask if there's anything else important about their injury they'd like to share
3. Let them know you now have enough information to create a personalized exercise plan
4. Tell them they can click "Generate Exercise Plan" when ready

Keep your tone encouraging and supportive.`;
    } else if (userMessageCount > 2) {
      systemContext += `\n\nProvide helpful information. If they ask questions, answer them. Remind them they can generate their exercise plan whenever they're ready.`;
    }

    const promptParts = [];
    
    promptParts.push({ text: systemContext });
    promptParts.push({ text: '\n\nPrevious conversation:' });
    
    if (history.length > 0) {
      for (const msg of history) {
        const role = msg.role === 'model' ? 'Assistant' : 'User';
        const text = msg.parts?.[0]?.text || '';
        if (text) {
          promptParts.push({ text: `${role}: ${text}` });
        }
      }
    }
    
    promptParts.push({ text: `\n\nUser's current message: ${message}\n\nAssistant response:` });

    console.log('Sending to Vertex AI Gemini with', promptParts.length, 'prompt parts');

    const llmResponse = await ai.generate({
      model: 'vertexai/gemini-2.0-flash-exp',
      prompt: promptParts,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    console.log('Genkit chat response generated');
    
    let responseText = '';
    if (llmResponse.text) {
      responseText = llmResponse.text;
    } else if (llmResponse.output?.text) {
      responseText = llmResponse.output.text;
    } else if (llmResponse.message?.content) {
      const content = llmResponse.message.content;
      if (Array.isArray(content)) {
        responseText = content.map(c => c.text || '').join('');
      }
    }
    
    console.log('Response text:', responseText.substring(0, 100));
    return { response: responseText };
  }
);

/**
 * Genkit flow for generating personalized exercise rehabilitation plans.
 * Creates 4-week progressive plan based on injury and conversation context.
 * @param {string} injuryType - Type of injury
 * @param {string} painLocation - Anatomical location of pain
 * @param {string} conversationSummary - Summary of chat conversation
 * @param {Array<string>} targetMuscles - Optional target muscle groups
 * @returns {Object} Structured 4-week exercise plan
 */
export const generateExercisePlanFlow = ai.defineFlow(
  {
    name: 'generateExercisePlan',
    inputSchema: z.object({
      injuryType: z.string(),
      painLocation: z.string(),
      conversationSummary: z.string(),
      targetMuscles: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      weeklyPlan: z.array(z.object({
        week: z.number(),
        exercises: z.array(z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.number(),
          duration: z.string().optional(),
          instructions: z.string(),
          focusPoints: z.array(z.string()),
          safetyTips: z.array(z.string()),
        })),
        progressionNotes: z.string(),
      })),
      overallGuidance: z.string(),
    }),
  },
  async ({ injuryType, painLocation, conversationSummary, targetMuscles = [] }) => {
    console.log('Genkit Flow: Generating exercise plan...');

    const muscleTargets = targetMuscles.length > 0 
      ? `Target these muscles: ${targetMuscles.join(', ')}`
      : '';

    const prompt = `You are a certified physical therapist creating a rehabilitation exercise plan.

Patient Information:
- Injury: ${injuryType}
- Location: ${painLocation}
- Conversation Summary: ${conversationSummary}
${muscleTargets}

Create a 4-week progressive rehabilitation plan. Each week should have 3-5 exercises that gradually increase in difficulty.

IMPORTANT: Return ONLY valid JSON with this structure:
{
  "weeklyPlan": [
    {
      "week": 1,
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": 10,
          "duration": "30 seconds",
          "instructions": "Clear step-by-step instructions",
          "focusPoints": ["Key focus point 1", "Key focus point 2"],
          "safetyTips": ["Safety tip 1", "Safety tip 2"]
        }
      ],
      "progressionNotes": "What to expect this week"
    }
  ],
  "overallGuidance": "General recovery advice and timeline"
}

Focus on:
1. Gradual progression (week 1: gentle, week 4: more challenging)
2. Pain-free range of motion
3. Functional movements relevant to daily activities
4. Safety considerations`;

    const llmResponse = await ai.generate({
      model: 'vertexai/gemini-2.0-flash-exp',
      prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });

    let responseText = '';
    if (llmResponse.text) {
      responseText = llmResponse.text;
    } else if (llmResponse.output?.text) {
      responseText = llmResponse.output.text;
    } else if (llmResponse.message?.content) {
      const content = llmResponse.message.content;
      if (Array.isArray(content)) {
        responseText = content.map(c => c.text || '').join('');
      }
    }
    
    console.log(' Genkit exercise plan generated');

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback plan
    return {
      weeklyPlan: [
        {
          week: 1,
          exercises: [
            {
              name: 'Gentle Range of Motion',
              sets: 3,
              reps: 10,
              duration: '2 minutes',
              instructions: 'Slowly move the affected area through its pain-free range of motion.',
              focusPoints: ['Move slowly', 'Stop if pain increases'],
              safetyTips: ['Never force movement', 'Warm up first'],
            },
          ],
          progressionNotes: 'Focus on gentle movement and pain management.',
        },
      ],
      overallGuidance: 'Progress gradually and listen to your body.',
    };
  }
);

/**
 * Genkit flow for analyzing exercise form using MediaPipe pose detection data.
 * Provides biomechanical feedback based on 3D skeleton tracking.
 * @param {Object} poseMetrics - Joint angles and movement data from MediaPipe
 * @param {Object} exercisePlan - Prescribed exercise details
 * @param {Object} injuryAnalysis - Patient's injury context
 * @returns {Object} Detailed form analysis with score and feedback
 */
export const analyzeExerciseFormWithPoseFlow = ai.defineFlow(
  {
    name: 'analyzeExerciseFormWithPose',
    inputSchema: z.object({
      poseMetrics: z.object({
        frames: z.number(),
        duration: z.string(),
        avgVisibility: z.string(),
        wristMovement: z.string().optional(),
        elbowMovement: z.string().optional(),
        kneeMovement: z.string().optional(),
        ankleMovement: z.string().optional(),
        hipMovement: z.string().optional(),
        wristRange: z.object({
          min: z.number(),
          max: z.number(),
          avg: z.number(),
        }).optional(),
        elbowRange: z.object({
          min: z.number(),
          max: z.number(),
          avg: z.number(),
        }).optional(),
        kneeRange: z.object({
          min: z.number(),
          max: z.number(),
          avg: z.number(),
        }).optional(),
        ankleRange: z.object({
          min: z.number(),
          max: z.number(),
          avg: z.number(),
        }).optional(),
        exerciseName: z.string(),
        exerciseFocusPoints: z.array(z.string()).optional(),
        exerciseSafetyTips: z.array(z.string()).optional(),
      }),
      exercisePlan: z.object({
        name: z.string(),
        sets: z.number().optional(),
        reps: z.number().optional(),
        instructions: z.string().optional(),
      }).optional(),
      injuryAnalysis: z.object({
        injuryType: z.string(),
        painLocation: z.string(),
      }).optional(),
    }),
    outputSchema: z.object({
      overallScore: z.number(),
      exercisePerformed: z.string(),
      wasCorrectExercise: z.boolean(),
      strengths: z.array(z.string()),
      improvements: z.array(z.string()),
      safetyChecks: z.array(z.string()),
      formAnalysis: z.string(),
      specificFeedback: z.string(),
      encouragement: z.string(),
      nextSteps: z.string(),
    }),
  },
  async ({ poseMetrics, exercisePlan, injuryAnalysis }) => {
    console.log('Genkit Flow: Analyzing exercise form with pose data...');
    console.log('Pose metrics:', poseMetrics);

    const prompt = `You are an expert physical therapist analyzing REAL-TIME 3D SKELETON TRACKING data from MediaPipe Pose Detection.

**PATIENT INJURY:**
- Type: ${injuryAnalysis?.injuryType || 'General rehabilitation'}
- Location: ${injuryAnalysis?.painLocation || 'Not specified'}

**PRESCRIBED EXERCISE:**
- Name: ${poseMetrics.exerciseName || exercisePlan?.name || 'Not specified'}
- Sets/Reps: ${exercisePlan?.sets || 'N/A'} sets × ${exercisePlan?.reps || 'N/A'} reps
- Instructions: ${exercisePlan?.instructions || 'See focus points'}
- Focus Points: ${poseMetrics.exerciseFocusPoints?.join(', ') || 'General form'}
- Safety Tips: ${poseMetrics.exerciseSafetyTips?.join(', ') || 'Listen to your body'}

**3D POSE DETECTION DATA (MediaPipe 33-landmark tracking):**
- Total Frames Captured: ${poseMetrics.frames}
- Exercise Duration: ${poseMetrics.duration} seconds
- Average Landmark Visibility: ${poseMetrics.avgVisibility}%

**JOINT ANGLE MEASUREMENTS (degrees):**
${poseMetrics.wristRange ? `- Wrist Angles: ${poseMetrics.wristRange.min.toFixed(1)}° → ${poseMetrics.wristRange.max.toFixed(1)}° (avg ${poseMetrics.wristRange.avg.toFixed(1)}°, movement amplitude ${poseMetrics.wristMovement}°)` : ''}
${poseMetrics.elbowRange ? `- Elbow Angles: ${poseMetrics.elbowRange.min.toFixed(1)}° → ${poseMetrics.elbowRange.max.toFixed(1)}° (avg ${poseMetrics.elbowRange.avg.toFixed(1)}°, movement amplitude ${poseMetrics.elbowMovement}°)` : ''}
${poseMetrics.kneeRange ? `- Knee Angles: ${poseMetrics.kneeRange.min.toFixed(1)}° → ${poseMetrics.kneeRange.max.toFixed(1)}° (avg ${poseMetrics.kneeRange.avg.toFixed(1)}°, movement amplitude ${poseMetrics.kneeMovement}°)` : ''}
${poseMetrics.ankleRange ? `- Ankle Angles: ${poseMetrics.ankleRange.min.toFixed(1)}° → ${poseMetrics.ankleRange.max.toFixed(1)}° (avg ${poseMetrics.ankleRange.avg.toFixed(1)}°, movement amplitude ${poseMetrics.ankleMovement}°)` : ''}
${poseMetrics.hipMovement ? `- Hip Movement: ${poseMetrics.hipMovement}° range` : ''}

**CRITICAL INSTRUCTIONS:**
1. **ONLY reference joint measurements that are RELEVANT to the injury location** (${injuryAnalysis?.painLocation || 'affected area'})
2. If the injury is in the wrist/hand, focus ONLY on wrist angles and arm movements
3. If the injury is in the knee/leg, focus ONLY on knee and ankle angles
4. Do NOT mention unrelated joints (e.g., don't discuss knee angles for a wrist injury)
5. Analyze if the movement amplitude is appropriate for this specific injury type
6. Check if the exercise matches what was prescribed
7. Provide injury-specific safety observations

Return ONLY valid JSON with this structure:
{
  "overallScore": 85,
  "exercisePerformed": "Name of exercise detected from movement pattern",
  "wasCorrectExercise": true,
  "strengths": ["What they did well - be specific about joint angles"],
  "improvements": ["What to work on - specific to injured body part only"],
  "safetyChecks": ["Safety observations relevant to the injury"],
  "formAnalysis": "Technical analysis of movement quality for the injured area",
  "specificFeedback": "Detailed feedback about the affected joint's performance",
  "encouragement": "Positive, motivating message",
  "nextSteps": "Specific actions for next session targeting the injury"
}

Score 0-100 based on: form quality (40%), safety (30%), movement amplitude (20%), consistency (10%)`;

    const llmResponse = await ai.generate({
      model: 'vertexai/gemini-2.0-flash-exp',
      prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1500,
      },
    });

    let responseText = '';
    if (llmResponse.text) {
      responseText = llmResponse.text;
    } else if (llmResponse.output?.text) {
      responseText = llmResponse.output.text;
    } else if (llmResponse.message?.content) {
      const content = llmResponse.message.content;
      if (Array.isArray(content)) {
        responseText = content.map(c => c.text || '').join('');
      }
    }
    
    console.log(' Genkit pose-based form analysis complete');

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback response
    return {
      overallScore: 75,
      exercisePerformed: poseMetrics.exerciseName || 'Unknown exercise',
      wasCorrectExercise: true,
      strengths: ['Completed the exercise', 'Good effort in performing movements'],
      improvements: ['Focus on maintaining proper form throughout', 'Work on movement consistency'],
      safetyChecks: ['Continue monitoring pain levels during exercise'],
      formAnalysis: 'Exercise completed with reasonable form based on pose tracking data.',
      specificFeedback: `Movement detected across ${poseMetrics.frames} frames over ${poseMetrics.duration} seconds.`,
      encouragement: 'Great work! Keep practicing and you\'ll see improvement in your rehabilitation.',
      nextSteps: 'Continue with prescribed exercises and gradually increase intensity as pain allows.',
    };
  }
);

console.log('Genkit flows initialized successfully');
