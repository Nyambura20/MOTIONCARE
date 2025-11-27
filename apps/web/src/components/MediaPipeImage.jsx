import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, AlertCircle } from 'lucide-react';

/**
 * MediaPipeImage Component
 * 
 * Analyzes static images for pose estimation using MediaPipe Pose.
 * Alternative to video for privacy-conscious patients or limited bandwidth.
 */
export default function MediaPipeImage({ imageUrl, onAnalysisComplete }) {
  const canvasRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzePose = async () => {
    if (!imageUrl) {
      setError('No image provided for analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // In production, this would use MediaPipe Pose for static images
      // For now, we'll simulate the analysis
      
      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Draw image to canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Simulate MediaPipe pose detection
      // In production, you would use:
      // const pose = new Pose({...});
      // const results = await pose.send({ image: canvas });

      // Simulated analysis result
      const simulatedResult = {
        poseDetected: true,
        landmarks: [
          // MediaPipe returns 33 landmarks with x, y, z, visibility
          // This is a simplified simulation
          { name: 'nose', x: 0.5, y: 0.2, visibility: 0.99 },
          { name: 'left_shoulder', x: 0.4, y: 0.35, visibility: 0.95 },
          { name: 'right_shoulder', x: 0.6, y: 0.35, visibility: 0.95 },
          { name: 'left_knee', x: 0.42, y: 0.7, visibility: 0.92 },
          { name: 'right_knee', x: 0.58, y: 0.7, visibility: 0.91 },
        ],
        angles: {
          leftKnee: 145, // degrees
          rightKnee: 142,
          leftHip: 165,
          rightHip: 168,
        },
        formScore: 82,
        feedback: [
          { type: 'success', message: 'Good posture alignment' },
          { type: 'warning', message: 'Right knee slightly inward' },
          { type: 'info', message: 'Maintain this depth for consistency' },
        ],
      };

      setAnalysisResult(simulatedResult);
      setIsAnalyzing(false);

      if (onAnalysisComplete) {
        onAnalysisComplete(simulatedResult);
      }

    } catch (err) {
      console.error('Pose analysis error:', err);
      setError('Failed to analyze pose. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Display */}
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden bg-gray-100 shadow-lg">
          <img
            src={imageUrl}
            alt="Exercise pose"
            className="w-full h-auto max-h-96 object-contain"
          />
          
          {/* Canvas for pose landmarks overlay */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ display: analysisResult ? 'block' : 'none' }}
          />

          {/* Analysis overlay indicators */}
          {analysisResult && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div className="text-xs text-gray-600 mb-1">Form Score</div>
              <div className={`text-3xl font-bold ${
                analysisResult.formScore >= 80 ? 'text-success' :
                analysisResult.formScore >= 60 ? 'text-warning' :
                'text-error'
              }`}>
                {analysisResult.formScore}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyze Button */}
      {imageUrl && !analysisResult && (
        <button
          onClick={analyzePose}
          disabled={isAnalyzing}
          className="btn-primary w-full disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
              Analyzing pose...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 inline mr-2" />
              Analyze Form with AI
            </>
          )}
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="notification notification-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-4">
          {/* Angles Detected */}
          <div className="card bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Joint Angles Detected</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xs text-gray-600 mb-1">Left Knee</div>
                <div className="text-xl font-bold text-primary">{analysisResult.angles.leftKnee}°</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xs text-gray-600 mb-1">Right Knee</div>
                <div className="text-xl font-bold text-primary">{analysisResult.angles.rightKnee}°</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xs text-gray-600 mb-1">Left Hip</div>
                <div className="text-xl font-bold text-info">{analysisResult.angles.leftHip}°</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xs text-gray-600 mb-1">Right Hip</div>
                <div className="text-xl font-bold text-info">{analysisResult.angles.rightHip}°</div>
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">AI Form Feedback</h4>
            {analysisResult.feedback.map((item, index) => (
              <div
                key={index}
                className={`notification notification-${item.type}`}
              >
                {item.type === 'success' && '✓'}
                {item.type === 'warning' && '⚠️'}
                {item.type === 'info' && 'ℹ️'}
                <span className="ml-2">{item.message}</span>
              </div>
            ))}
          </div>

          {/* Re-analyze option */}
          <button
            onClick={() => {
              setAnalysisResult(null);
              analyzePose();
            }}
            className="btn-ghost w-full"
          >
            Re-analyze Image
          </button>
        </div>
      )}
    </div>
  );
}
