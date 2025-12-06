const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');

/**
 * Analyze exercise form using MediaPipe pose detection data and AI feedback.
 * @param {Array} poseLandmarksHistory - Array of pose landmarks over time
 * @param {Object} exercisePlan - The exercise plan being performed
 * @param {Object} injuryAnalysis - The injury analysis data
 * @returns {Promise<Object>} Detailed feedback on form and technique
 */
export async function analyzeExerciseForm(poseLandmarksHistory, exercisePlan, injuryAnalysis) {
  try {
    console.log('Analyzing exercise form with', poseLandmarksHistory?.length || 0, 'pose frames...');
    console.log('Injury context:', injuryAnalysis?.injuryType, 'at', injuryAnalysis?.painLocation);

    if (!poseLandmarksHistory || poseLandmarksHistory.length === 0) {
      return {
        overallScore: 0,
        error: true,
        networkIssue: !navigator.onLine,
        strengths: [],
        improvements: [
          'No pose data was captured during the exercise',
          'Make sure you are visible in the camera',
          'Try recording again with better lighting'
        ],
        safetyChecks: [
          'Ensure camera has permission to access webcam',
          'Check that you are within camera frame'
        ],
        encouragement: 'Let\'s try again! Make sure your full body is visible.',
        nextSteps: 'Record your exercise again, ensuring you are fully visible in the frame.'
      };
    }

    // Calculate metrics from pose data
    const metrics = calculateMovementMetrics(poseLandmarksHistory, exercisePlan?.weeklyPlan?.[0]?.exercises?.[0]);
    
    console.log(' Calculated metrics:', metrics);
    
    // Send to AI backend for detailed analysis
    console.log(' Sending to AI for analysis...');
    const response = await fetch(`${API_URL}/api/analyze-exercise-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        poseMetrics: metrics,
        exercisePlan: exercisePlan,
        injuryAnalysis: injuryAnalysis
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    console.log('AI analysis complete:', data.analysis);
    
    return data.analysis;
    
  } catch (error) {
    console.error('Error analyzing exercise form:', error);
    
    return {
      overallScore: 0,
      error: true,
      networkIssue: !navigator.onLine,
      strengths: [],
      improvements: [
        !navigator.onLine 
          ? 'No internet connection detected. Please check your network and try again.'
          : `Analysis failed: ${error.message}. Please try recording your exercise again.`
      ],
      safetyChecks: [
        'Make sure you have a stable internet connection',
        'Ensure proper lighting and camera positioning'
      ],
      encouragement: 'Don\'t give up! Technical issues happen.',
      nextSteps: 'Try again when your connection is stable.'
    };
  }
}

/**
 * Calculate movement metrics from pose history
 */
function calculateMovementMetrics(history, exercise) {
  const frames = history.length;
  const duration = (history[history.length - 1].timestamp - history[0].timestamp) / 1000; // seconds
  
  // Track movement ranges
  let shoulderMovement = 0;
  let elbowMovement = 0;
  let kneeMovement = 0;
  let wristMovement = 0;
  let ankleMovement = 0;
  let hipMovement = 0;
  let bodyStability = 0;
  
  // Track joint angles for exercise-specific analysis
  let kneeAngles = [];
  let elbowAngles = [];
  let hipAngles = [];
  let wristAngles = [];
  let ankleAngles = [];
  
  // Calculate average visibility (pose quality)
  let avgVisibility = 0;
  let visibilityCount = 0;
  
  for (let i = 0; i < history.length; i++) {
    const landmarks = history[i].landmarks;
    if (!landmarks) continue;
    
    // Sum visibility scores
    landmarks.forEach(lm => {
      if (lm.visibility) {
        avgVisibility += lm.visibility;
        visibilityCount++;
      }
    });
    
    // Calculate joint angles (for exercise matching)
    // Knee angle: hip(23/24) -> knee(25/26) -> ankle(27/28)
    if (landmarks[23] && landmarks[25] && landmarks[27]) {
      const angle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
      kneeAngles.push(angle);
    }
    
    // Elbow angle: shoulder(11/12) -> elbow(13/14) -> wrist(15/16)
    if (landmarks[11] && landmarks[13] && landmarks[15]) {
      const angle = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
      elbowAngles.push(angle);
    }
    
    // Hip angle: shoulder(11/12) -> hip(23/24) -> knee(25/26)
    if (landmarks[11] && landmarks[23] && landmarks[25]) {
      const angle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);
      hipAngles.push(angle);
    }
    
    // Wrist angle: elbow(13/14) -> wrist(15/16) -> index finger(19/20)
    if (landmarks[13] && landmarks[15] && landmarks[19]) {
      const angle = calculateAngle(landmarks[13], landmarks[15], landmarks[19]);
      wristAngles.push(angle);
    }
    
    // Ankle angle: knee(25/26) -> ankle(27/28) -> foot index(31/32)
    if (landmarks[25] && landmarks[27] && landmarks[31]) {
      const angle = calculateAngle(landmarks[25], landmarks[27], landmarks[31]);
      ankleAngles.push(angle);
    }
    
    if (i > 0) {
      const prev = history[i-1].landmarks;
      
      // Calculate joint movements (simplified)
      // Shoulders: landmarks 11, 12
      if (landmarks[11] && landmarks[12] && prev[11] && prev[12]) {
        shoulderMovement += Math.abs(landmarks[11].y - prev[11].y) + Math.abs(landmarks[12].y - prev[12].y);
      }
      
      // Elbows: landmarks 13, 14
      if (landmarks[13] && landmarks[14] && prev[13] && prev[14]) {
        elbowMovement += Math.abs(landmarks[13].y - prev[13].y) + Math.abs(landmarks[14].y - prev[14].y);
      }
      
      // Knees: landmarks 25, 26
      if (landmarks[25] && landmarks[26] && prev[25] && prev[26]) {
        kneeMovement += Math.abs(landmarks[25].y - prev[25].y) + Math.abs(landmarks[26].y - prev[26].y);
      }
      
      // Wrists: landmarks 15, 16
      if (landmarks[15] && landmarks[16] && prev[15] && prev[16]) {
        wristMovement += Math.abs(landmarks[15].x - prev[15].x) + Math.abs(landmarks[15].y - prev[15].y) + 
                         Math.abs(landmarks[16].x - prev[16].x) + Math.abs(landmarks[16].y - prev[16].y);
      }
      
      // Ankles: landmarks 27, 28
      if (landmarks[27] && landmarks[28] && prev[27] && prev[28]) {
        ankleMovement += Math.abs(landmarks[27].y - prev[27].y) + Math.abs(landmarks[28].y - prev[28].y);
      }
      
      // Hips: landmarks 23, 24 (core stability)
      if (landmarks[23] && landmarks[24] && prev[23] && prev[24]) {
        const hipMove = Math.abs(landmarks[23].x - prev[23].x) + Math.abs(landmarks[24].x - prev[24].x);
        bodyStability += hipMove;
      }
    }
  }
  
  avgVisibility = visibilityCount > 0 ? avgVisibility / visibilityCount : 0;
  
  // Calculate angle ranges
  const kneeRange = kneeAngles.length > 0 ? {
    min: Math.min(...kneeAngles),
    max: Math.max(...kneeAngles),
    avg: kneeAngles.reduce((a, b) => a + b, 0) / kneeAngles.length
  } : null;
  
  const elbowRange = elbowAngles.length > 0 ? {
    min: Math.min(...elbowAngles),
    max: Math.max(...elbowAngles),
    avg: elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length
  } : null;
  
  const hipRange = hipAngles.length > 0 ? {
    min: Math.min(...hipAngles),
    max: Math.max(...hipAngles),
    avg: hipAngles.reduce((a, b) => a + b, 0) / hipAngles.length
  } : null;
  
  const wristRange = wristAngles.length > 0 ? {
    min: Math.min(...wristAngles),
    max: Math.max(...wristAngles),
    avg: wristAngles.reduce((a, b) => a + b, 0) / wristAngles.length
  } : null;
  
  const ankleRange = ankleAngles.length > 0 ? {
    min: Math.min(...ankleAngles),
    max: Math.max(...ankleAngles),
    avg: ankleAngles.reduce((a, b) => a + b, 0) / ankleAngles.length
  } : null;
  
  return {
    frames,
    duration: duration.toFixed(1),
    avgVisibility: (avgVisibility * 100).toFixed(0),
    shoulderMovement: shoulderMovement.toFixed(2),
    elbowMovement: elbowMovement.toFixed(2),
    kneeMovement: kneeMovement.toFixed(2),
    wristMovement: wristMovement.toFixed(2),
    ankleMovement: ankleMovement.toFixed(2),
    hipMovement: hipMovement.toFixed(2),
    bodyStability: (bodyStability / frames).toFixed(4),
    movementScore: (shoulderMovement + elbowMovement + kneeMovement + wristMovement + ankleMovement) / frames,
    kneeRange,
    elbowRange,
    hipRange,
    wristRange,
    ankleRange,
    exerciseName: exercise?.name || 'Unknown exercise',
    exerciseFocusPoints: exercise?.focusPoints || [],
    exerciseSafetyTips: exercise?.safetyTips || []
  };
}

/**
 * Calculate angle between three points
 */
function calculateAngle(pointA, pointB, pointC) {
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) - 
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}
