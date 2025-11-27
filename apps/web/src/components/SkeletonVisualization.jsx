import React, { useRef, useEffect } from 'react'

/**
 * 3D Skeleton Visualization Component
 * Renders a 3D skeleton representation based on MediaPipe pose landmarks
 */
export default function SkeletonVisualization({ poseLandmarks, className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !poseLandmarks) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    const width = canvas.width
    const height = canvas.height
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw dark background with grid
    drawBackground(ctx, width, height)
    
    // Draw 3D skeleton
    drawSkeleton(ctx, poseLandmarks, width, height)
  }, [poseLandmarks])

  const drawBackground = (ctx, width, height) => {
    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#0a0e27')
    gradient.addColorStop(1, '#1a1f3a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Grid lines
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)'
    ctx.lineWidth = 1
    
    // Vertical lines
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // Horizontal lines
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Center crosshair
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }

  const drawSkeleton = (ctx, landmarks, width, height) => {
    if (!landmarks || landmarks.length === 0) {
      // Show "waiting for pose" message
      ctx.fillStyle = 'rgba(100, 150, 255, 0.5)'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Waiting for pose detection...', width / 2, height / 2)
      return
    }

    // Define skeleton connections with colors
    const connections = [
      // Torso (cyan)
      { start: 11, end: 12, color: '#00FFFF', width: 12 },
      { start: 11, end: 23, color: '#00FFFF', width: 10 },
      { start: 12, end: 24, color: '#00FFFF', width: 10 },
      { start: 23, end: 24, color: '#00FFFF', width: 10 },
      
      // Left arm (green)
      { start: 11, end: 13, color: '#00FF00', width: 10 },
      { start: 13, end: 15, color: '#00FF00', width: 9 },
      { start: 15, end: 17, color: '#00FF00', width: 7 },
      { start: 15, end: 19, color: '#00FF00', width: 5 },
      { start: 15, end: 21, color: '#00FF00', width: 5 },
      
      // Right arm (lime)
      { start: 12, end: 14, color: '#7FFF00', width: 10 },
      { start: 14, end: 16, color: '#7FFF00', width: 9 },
      { start: 16, end: 18, color: '#7FFF00', width: 7 },
      { start: 16, end: 20, color: '#7FFF00', width: 5 },
      { start: 16, end: 22, color: '#7FFF00', width: 5 },
      
      // Left leg (yellow)
      { start: 23, end: 25, color: '#FFFF00', width: 11 },
      { start: 25, end: 27, color: '#FFFF00', width: 10 },
      { start: 27, end: 29, color: '#FFFF00', width: 6 },
      { start: 27, end: 31, color: '#FFFF00', width: 6 },
      { start: 29, end: 31, color: '#FFFF00', width: 5 },
      
      // Right leg (orange)
      { start: 24, end: 26, color: '#FFA500', width: 11 },
      { start: 26, end: 28, color: '#FFA500', width: 10 },
      { start: 28, end: 30, color: '#FFA500', width: 6 },
      { start: 28, end: 32, color: '#FFA500', width: 6 },
      { start: 30, end: 32, color: '#FFA500', width: 5 },
      
      // Face (pink)
      { start: 0, end: 1, color: '#FF1493', width: 4 },
      { start: 1, end: 2, color: '#FF1493', width: 4 },
      { start: 2, end: 3, color: '#FF1493', width: 4 },
      { start: 3, end: 7, color: '#FF1493', width: 4 },
      { start: 0, end: 4, color: '#FF1493', width: 4 },
      { start: 4, end: 5, color: '#FF1493', width: 4 },
      { start: 5, end: 6, color: '#FF1493', width: 4 },
      { start: 6, end: 8, color: '#FF1493', width: 4 },
      
      // Shoulders (cyan)
      { start: 11, end: 13, color: '#00FFFF', width: 8 },
      { start: 12, end: 14, color: '#00FFFF', width: 8 }
    ]

    // Draw glow effect behind connections
    connections.forEach(({ start, end, color, width: lineWidth }) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      
      if (!startPoint || !endPoint) return
      
      // Draw glow
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth + 8
      ctx.globalAlpha = 0.3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(startPoint.x * width, startPoint.y * height)
      ctx.lineTo(endPoint.x * width, endPoint.y * height)
      ctx.stroke()
    })
    
    ctx.globalAlpha = 1
    
    // Draw main connections
    connections.forEach(({ start, end, color, width: lineWidth }) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      
      if (!startPoint || !endPoint) return
      
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(startPoint.x * width, startPoint.y * height)
      ctx.lineTo(endPoint.x * width, endPoint.y * height)
      ctx.stroke()
    })
    
    // Draw landmarks as glowing joints
    const importantJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    
    landmarks.forEach((landmark, index) => {
      if (!landmark) return
      
      const x = landmark.x * width
      const y = landmark.y * height
      const isImportant = importantJoints.includes(index)
      const radius = isImportant ? 14 : 8
      
      // Outer glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.4)')
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius * 2, 0, 2 * Math.PI)
      ctx.fill()
      
      // Inner circle (white core)
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Middle ring (colored)
      ctx.strokeStyle = isImportant ? '#00FFFF' : '#4B9EFF'
      ctx.lineWidth = 3
      ctx.stroke()
    })
    
    // Draw status indicator
    ctx.fillStyle = '#00FF00'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('🟢 POSE DETECTED', 20, 40)
    
    // Draw joint count
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '16px Arial'
    ctx.fillText(`${landmarks.length} joints tracked`, 20, 70)
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={600}
        height={800}
        className="w-full h-full rounded-xl"
        style={{ background: '#0a0e27' }}
      />
      {!poseLandmarks && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-300 font-semibold">Analyzing Movement...</p>
          </div>
        </div>
      )}
    </div>
  )
}
