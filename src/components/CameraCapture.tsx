import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  photos: string[]; // array of base64 dataURIs
  onChange: (photos: string[]) => void;
  label?: string;
  maxPhotos?: number;
}

export default function CameraCapture({
  photos,
  onChange,
  label = 'Condition Photos',
  maxPhotos = 5,
}: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream when component unmounts or camera is deactivated
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access device camera. Please check permissions or upload photos instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (isCameraActive) {
      // Restart camera with new facing mode
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURI = canvas.toDataURL('image/jpeg', 0.85);

        if (photos.length < maxPhotos) {
          onChange([...photos, dataURI]);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);

    let newPhotos = [...photos];
    let loadedCount = 0;

    if (filesToProcess.length === 0) return;

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (newPhotos.length < maxPhotos) {
            newPhotos.push(reader.result);
          }
        }
        loadedCount++;
        if (loadedCount === filesToProcess.length) {
          onChange(newPhotos);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset file input value so same file can be chosen again
    e.target.value = '';
  };

  const removePhoto = (indexToRemove: number) => {
    onChange(photos.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-lg font-semibold text-stone-800 flex items-center gap-2">
          {label}
          <span className="text-sm font-normal text-stone-500">
            ({photos.length}/{maxPhotos} photos)
          </span>
        </label>

        <div className="flex gap-2">
          {!isCameraActive ? (
            <button
              type="button"
              id="btn-start-camera"
              onClick={startCamera}
              className="px-3 py-2 text-base font-medium rounded-none bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Camera className="w-5 h-5 text-stone-600" />
              Use Web Camera
            </button>
          ) : (
            <button
              type="button"
              id="btn-stop-camera"
              onClick={stopCamera}
              className="px-3 py-2 text-base font-medium rounded-none bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
              Close Camera
            </button>
          )}

          <button
            type="button"
            id="btn-upload-trigger"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-base font-medium rounded-none bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-5 h-5 text-amber-600" />
            Upload File
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            id="input-file-photos"
          />
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-none text-base flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera Live Stream Window */}
      {isCameraActive && (
        <div className="relative bg-stone-900 rounded-none overflow-hidden shadow-inner border border-stone-800 flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-h-[350px] object-cover"
          />

          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              id="btn-camera-flip"
              onClick={toggleCameraFacing}
              className="p-2.5 rounded-none bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full p-4 bg-stone-950/90 flex justify-center gap-4 items-center">
            <button
              type="button"
              id="btn-capture"
              onClick={capturePhoto}
              disabled={photos.length >= maxPhotos}
              className="px-6 py-3 rounded-none bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold text-lg flex items-center gap-2 shadow transition-all transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              Capture Condition Photo
            </button>
            <span className="text-sm text-stone-300">
              {photos.length >= maxPhotos ? 'Max reached' : `${maxPhotos - photos.length} remaining`}
            </span>
          </div>
        </div>
      )}

      {/* Grid of Photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
          {photos.map((photo, idx) => (
            <div
              key={idx}
              className="group relative aspect-video sm:aspect-square bg-stone-100 rounded-none overflow-hidden border border-stone-200 shadow-sm"
            >
              <img
                src={photo}
                alt={`Condition Capture ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                id={`btn-remove-photo-${idx}`}
                onClick={() => removePhoto(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-none bg-red-600/90 hover:bg-red-700 text-white shadow-md transition-colors cursor-pointer"
                title="Delete Photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-none font-mono">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !isCameraActive && (
        <div className="border-2 border-dashed border-stone-200 rounded-none p-6 text-center text-stone-500 bg-stone-50/50">
          <Camera className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-base font-medium">No condition photos captured or uploaded yet</p>
          <p className="text-sm text-stone-400 mt-1">
            Optional but recommended for damage dispute avoidance during costume returns.
          </p>
        </div>
      )}
    </div>
  );
}
