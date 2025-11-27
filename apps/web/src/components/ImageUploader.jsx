import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * ImageUploader Component
 * 
 * Allows patients to upload exercise photos as an alternative to video.
 * Supports both camera capture and file upload.
 * Privacy-friendly: Images auto-deleted after 72 hours per HIPAA policy.
 */
export default function ImageUploader({ onUploadComplete, exerciseName }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [captureMode, setCaptureMode] = useState('upload'); // 'upload' | 'camera'
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadStatus('error');
      alert('Please select a valid image file (JPG, PNG, HEIC)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      alert('Image size must be less than 10MB');
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadStatus(null);
  };

  const handleCameraCapture = (event) => {
    handleFileSelect(event);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      // Convert image to base64
      const base64Image = await convertToBase64(selectedImage);

      // Upload to Firebase Functions endpoint
      const response = await fetch('http://localhost:5001/motioncare-dev/us-central1/uploadImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          exerciseName: exerciseName || 'Exercise Photo',
          timestamp: new Date().toISOString(),
          userId: 'user123', // Replace with actual auth user ID
        }),
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setUploadStatus('success');
      setIsUploading(false);

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          url: data.url,
          fileName: data.fileName,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Clear preview after 3 seconds
      setTimeout(() => {
        clearImage();
      }, 3000);

    } catch (error) {
      console.error('Image upload error:', error);
      setUploadStatus('error');
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Upload Exercise Photo</h3>
        <span className="badge-info text-xs">Auto-deleted in 72hrs</span>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => {
            setCaptureMode('upload');
            clearImage();
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            captureMode === 'upload'
              ? 'bg-primary text-white shadow-clinical'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Upload Photo
        </button>
        <button
          onClick={() => {
            setCaptureMode('camera');
            clearImage();
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            captureMode === 'camera'
              ? 'bg-primary text-white shadow-clinical'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Camera className="w-4 h-4 inline mr-2" />
          Take Photo
        </button>
      </div>

      {/* Upload/Capture Area */}
      {!previewUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {captureMode === 'upload' ? (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                Click to select a photo from your device
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Supported formats: JPG, PNG, HEIC (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn-primary cursor-pointer inline-block"
              >
                Select Photo
              </label>
            </>
          ) : (
            <>
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                Use your device camera to capture
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Make sure you're in good lighting
              </p>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
                id="camera-capture"
              />
              <label
                htmlFor="camera-capture"
                className="btn-primary cursor-pointer inline-block"
              >
                Open Camera
              </label>
            </>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Image Preview */}
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain"
            />
            
            {/* Clear button */}
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
              disabled={isUploading}
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Upload Status */}
          {uploadStatus === 'success' && (
            <div className="notification-success mt-4">
              <CheckCircle className="w-5 h-5" />
              <span>Photo uploaded successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="notification-error mt-4">
              <AlertCircle className="w-5 h-5" />
              <span>Upload failed. Please try again.</span>
            </div>
          )}

          {/* Upload Button */}
          {!uploadStatus && (
            <button
              onClick={uploadImage}
              disabled={isUploading}
              className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 inline mr-2" />
                  Upload Photo
                </>
              )}
            </button>
          )}

          {/* Privacy Notice */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            🔒 HIPAA-compliant storage. Photo will be automatically deleted after 72 hours.
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">📸 Photo Tips:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Ensure good lighting for clear pose detection</li>
          <li>• Capture full body in frame (head to feet)</li>
          <li>• Take photos at key exercise positions (start, middle, end)</li>
          <li>• Stand 6-8 feet from camera for best results</li>
        </ul>
      </div>
    </div>
  );
}
