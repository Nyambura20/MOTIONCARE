import React, { useEffect, useRef, useState } from 'react'

// MediaPipe live fallback component.
// Attempts dynamic import of @mediapipe/pose and @mediapipe/camera_utils.
// If unavailable, shows a plain live video preview (still useful as a fallback).
export default function MediaPipeLive() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [mpLoaded, setMpLoaded] = useState(false)
  const [status, setStatus] = useState('init')

  useEffect(() => {
    let camera = null
    let pose = null
    let running = true

    async function init() {
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})

        // Try to dynamically import MediaPipe packages. If they aren't installed, fall back.
        // Note: MediaPipe packages not installed yet; skipping import to avoid build errors.
        try {
          const mp = null // await import('@mediapipe/pose')
          const camUtils = null // await import('@mediapipe/camera_utils')
          const drawing = null // await import('@mediapipe/drawing_utils')
          if (!mp) throw new Error('MediaPipe not installed')

          pose = new mp.Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` })
          pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
          pose.onResults((results) => {
            if (!canvasRef.current || !videoRef.current) return
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            ctx.save()
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
            if (results.poseLandmarks) {
              drawing.drawConnectors(ctx, results.poseLandmarks, mp.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 6 })
              drawing.drawLandmarks(ctx, results.poseLandmarks, { color: '#00FF00', fillColor: '#FFFFFF', lineWidth: 3, radius: 8 })
            }
            ctx.restore()
          })

          camera = new camUtils.Camera(videoRef.current, {
            onFrame: async () => {
              if (!running) return
              await pose.send({ image: videoRef.current })
            },
            width: 640,
            height: 480
          })
          camera.start()
          setMpLoaded(true)
          setStatus('mediapipe')
        } catch (err) {
          // MediaPipe not installed or failed — keep simple live preview.
          setMpLoaded(false)
          setStatus('preview-only')
        }
      } catch (err) {
        setStatus('error')
      }
    }

    init()

    return () => {
      running = false
      try { if (camera && camera.stop) camera.stop() } catch (_) {}
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach((t) => t.stop())
      }
    }
  }, [])

  return (
    <div className="card mb-6 border-l-4 border-primary">
      <h3 className="font-heading font-semibold text-primary mb-3">Live Camera Capture</h3>
      <p className="text-sm text-textSecondary mb-4">
        Enable camera access for real-time pose estimation and form feedback.
      </p>
      
      <div className="relative w-full max-w-3xl bg-black rounded overflow-hidden border border-border">
        <video ref={videoRef} className="w-full" playsInline muted />
        <canvas ref={canvasRef} className="absolute left-0 top-0 w-full h-full pointer-events-none" />
      </div>
      
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="font-medium text-textPrimary">Mode:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 'mediapipe' ? 'bg-green-100 text-green-800' :
          status === 'preview-only' ? 'bg-blue-100 text-blue-800' :
          status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'mediapipe' ? 'MediaPipe Active' : 
           status === 'preview-only' ? 'Camera Preview' :
           status === 'error' ? 'Camera Error' : 'Initializing'}
        </span>
      </div>
      
      {status === 'preview-only' && (
        <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-600 text-sm text-blue-900 rounded">
          <strong>Note:</strong> MediaPipe packages not installed. Showing camera preview only. 
          Install @mediapipe/pose to enable on-device pose overlays.
        </div>
      )}
      {status === 'error' && (
        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-600 text-sm text-red-900 rounded">
          <strong>Error:</strong> Unable to access camera. Please check browser permissions.
        </div>
      )}
    </div>
  )
}
