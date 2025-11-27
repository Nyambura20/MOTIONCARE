import React, { useState, useRef } from 'react'

export default function VideoUploader({ uploadUrl }) {
  const [fileName, setFileName] = useState(null)
  const [status, setStatus] = useState('idle')
  const [response, setResponse] = useState(null)
  const videoRef = useRef(null)

  const onFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    if (videoRef.current) videoRef.current.src = url

    // Read file as base64 and POST to functions endpoint
    setStatus('reading')
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      setStatus('uploading')
      try {
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, data: base64 })
        })
        const json = await res.json()
        setResponse(json)
        setStatus('done')
      } catch (err) {
        setResponse({ error: String(err) })
        setStatus('error')
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="card mt-6 border-l-4 border-primary">
      <h3 className="font-heading font-semibold text-primary mb-3">Upload Exercise Video</h3>
      <p className="text-sm text-textSecondary mb-4">
        Select a short video (10-30 seconds) showing the exercise for AI analysis.
      </p>
      
      <label className="btn-primary cursor-pointer inline-block">
        <input type="file" accept="video/*" onChange={onFileChange} className="hidden" />
        Choose Video File
      </label>

      {fileName && (
        <div className="mt-4">
          <div className="text-sm font-medium text-textPrimary mb-2">Preview:</div>
          <video ref={videoRef} controls className="w-full max-h-96 rounded border border-border bg-black" />
        </div>
      )}

      <div className="mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-textPrimary">Status:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            status === 'done' ? 'bg-green-100 text-green-800' :
            status === 'error' ? 'bg-red-100 text-red-800' :
            status === 'uploading' || status === 'reading' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status === 'idle' ? 'Ready' : status}
          </span>
        </div>
        {response && (
          <div className="mt-3">
            <div className="font-medium text-textPrimary mb-1">Response:</div>
            <pre className="p-3 bg-accent rounded text-xs border border-border overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
