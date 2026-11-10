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

    setCameraError(null);
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    const validFiles: File[] = [];
    for (const file of Array.from(files) as File[]) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setCameraError(`File "${file.name}" has an unsupported format. Only JPG, PNG, and WebP are allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setCameraError(`File "${file.name}" exceeds the maximum allowed size of 5 MB.`);
        continue;
      }
      validFiles.push(file);
    }

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess: File[] = validFiles.slice(0, remainingSlots);

    let newPhotos = [...photos];
    let loadedCount = 0;

    if (filesToProcess.length === 0) {
      e.target.value = '';
      return;
    }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="text-sm sm:text-base font-bold text-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span>{label}</span>
          <span className="text-xs sm:text-sm font-medium text-slate-500 font-mono">
            ({photos.length}/{maxPhotos} photos)
          </span>
        </label>

        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          {!isCameraActive ? (
            <button
              type="button"
              id="btn-start-camera"
              onClick={startCamera}
              className="px-3 py-2 text-xs sm:text-sm font-bold rounded-xl neo-btn text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-600 shrink-0" />
              <span>Use Camera</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-stop-camera"
              onClick={stopCamera}
              className="px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 shrink-0" />
              <span>Close Camera</span>
            </button>
          )}

          <button
            type="button"
            id="btn-upload-trigger"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-xs sm:text-sm font-bold rounded-xl neo-btn text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Upload File</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            id="input-file-photos"
          />
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera Live Stream Window */}
      {isCameraActive && (
        <div className="relative bg-stone-900 rounded-2xl overflow-hidden shadow-inner border border-stone-800 flex flex-col items-center">
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
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full p-4 bg-stone-950/90 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 items-center">
            <button
              type="button"
              id="btn-capture"
              onClick={capturePhoto}
              disabled={photos.length >= maxPhotos}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow transition-all transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </button>
            <span className="text-xs sm:text-sm text-stone-300 font-mono">
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
              className="group relative aspect-video sm:aspect-square bg-stone-100 rounded-xl overflow-hidden border border-stone-200 shadow-sm"
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
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white shadow-md transition-colors cursor-pointer"
                title="Delete Photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1.5 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-mono font-bold">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !isCameraActive && (
        <div className="border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center text-stone-500 bg-stone-50/50">
          <Camera className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm sm:text-base font-bold text-slate-700">No condition photos captured yet</p>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Optional but recommended for damage dispute avoidance during costume returns.
          </p>
        </div>
      )}
    </div>
  );
}
