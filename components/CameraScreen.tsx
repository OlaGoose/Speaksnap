'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  History,
  ChevronDown,
  Mic,
  Sparkles,
  Check,
  MapPin,
  MapPinOff,
  Loader2,
} from 'lucide-react';
import { Screen, UserLevel } from '@/lib/types';

interface CameraScreenProps {
  onCapture: (imageSrc: string, location?: { lat: number; lng: number }) => void;
  onVoiceCapture: (audioBlob: string, location?: { lat: number; lng: number }) => void;
  onNavigate: (screen: Screen) => void;
  userLevel: UserLevel;
  setUserLevel: (level: UserLevel) => void;
}

type Mode = 'voice' | 'camera' | 'upload';

export default function CameraScreen({
  onCapture,
  onVoiceCapture,
  onNavigate,
  userLevel,
  setUserLevel,
}: CameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>('camera');
  const [isRecording, setIsRecording] = useState(false);

  // Location State
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        setError('Camera unavailable');
      }
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Scroll handling for mode switcher
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const center = container.scrollLeft + container.offsetWidth / 2;
      const children = Array.from(container.children) as HTMLElement[];

      let closestElement: HTMLElement | null = null;
      let minDistance = Infinity;

      children.forEach((child) => {
        if (child.classList.contains('spacer')) return;

        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const distance = Math.abs(childCenter - center);

        if (distance < minDistance) {
          minDistance = distance;
          closestElement = child;
        }
      });

      if (closestElement) {
        const mode = (closestElement as HTMLElement).dataset.mode as Mode;
        if (mode && mode !== activeMode) {
          setActiveMode(mode);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => container?.removeEventListener('scroll', handleScroll);
  }, [activeMode]);

  // Auto-scroll to camera on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cameraEl = container.querySelector('[data-mode="camera"]') as HTMLElement;
      if (cameraEl) {
        container.scrollTo({
          left: cameraEl.offsetLeft - container.offsetWidth / 2 + cameraEl.offsetWidth / 2,
          behavior: 'instant',
        });
      }
    }
  }, []);

  const getCurrentPosition = (): Promise<{ lat: number; lng: number } | undefined> => {
    return new Promise((resolve) => {
      if (!isLocationEnabled || !navigator.geolocation) {
        resolve(undefined);
        return;
      }

      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsFetchingLocation(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error('Location error:', err);
          setIsFetchingLocation(false);
          resolve(undefined);
        },
        { timeout: 5000 }
      );
    });
  };

  const handleSnap = async () => {
    if (videoRef.current && canvasRef.current) {
      const location = await getCurrentPosition();
      const context = canvasRef.current.getContext('2d');

      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        // Resize image
        const MAX_DIM = 1024;
        let w = canvasRef.current.width;
        let h = canvasRef.current.height;
        if (w > h) {
          if (w > MAX_DIM) {
            h *= MAX_DIM / w;
            w = MAX_DIM;
          }
        } else {
          if (h > MAX_DIM) {
            w *= MAX_DIM / h;
            h = MAX_DIM;
          }
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(canvasRef.current, 0, 0, w, h);

        onCapture(tempCanvas.toDataURL('image/jpeg', 0.7), location);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const location = await getCurrentPosition();
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_DIMENSION = 1024;

            if (width > height) {
              if (width > MAX_DIMENSION) {
                height *= MAX_DIMENSION / width;
                width = MAX_DIMENSION;
              }
            } else {
              if (height > MAX_DIMENSION) {
                width *= MAX_DIMENSION / height;
                height = MAX_DIMENSION;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            onCapture(canvas.toDataURL('image/jpeg', 0.7), location);
          };
          img.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let options: MediaRecorderOptions | undefined = undefined;

        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }

        const mediaRecorder = options
          ? new MediaRecorder(audioStream, options)
          : new MediaRecorder(audioStream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const location = await getCurrentPosition();
          const mimeType = mediaRecorder.mimeType || options?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioStream.getTracks().forEach((track) => track.stop());

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            onVoiceCapture(reader.result as string, location);
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (e) {
        console.error('MediaRecorder error:', e);
        alert('Microphone access failed.');
        setIsRecording(false);
      }
    }
  };

  const handleMainAction = () => {
    if (activeMode === 'camera') handleSnap();
    else if (activeMode === 'voice') toggleRecording();
    else if (activeMode === 'upload') fileInputRef.current?.click();
  };

  const modes = [
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'camera', icon: Sparkles, label: 'Camera' },
    { id: 'upload', icon: ImageIcon, label: 'Upload' },
  ];

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col select-none text-white">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 bg-black">
        {!error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                activeMode === 'voice' ? 'blur-2xl opacity-60 scale-105' : 'opacity-100'
              }`}
            />

            {/* Voice Mode Visuals */}
            <div
              className={`absolute inset-0 flex items-center justify-center flex-col z-10 transition-opacity duration-500 pointer-events-none ${
                activeMode === 'voice' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <p className="text-white/90 mt-[-20%] text-2xl font-light tracking-tight drop-shadow-md text-center px-6">
                {isRecording ? 'Listening...' : 'Tap to speak your request'}
              </p>
              {isLocationEnabled && (
                <div className="mt-4 flex items-center gap-2 text-white/50 text-sm">
                  <MapPin size={14} />
                  <span>Location context active</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Camera unavailable
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="absolute top-4 left-0 right-0 p-6 z-20 flex justify-between items-start safe-area-top">
        <button
          onClick={() => onNavigate(Screen.LIBRARY)}
          className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/40 transition-all active:scale-95"
        >
          <History size={18} />
        </button>

        <div className="flex items-center gap-2">
          {/* Location Toggle */}
          <button
            onClick={() => setIsLocationEnabled(!isLocationEnabled)}
            className={`h-10 w-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-95 ${
              isLocationEnabled
                ? 'bg-blue-500/30 text-blue-400'
                : 'bg-black/20 text-white/40'
            }`}
            title={isLocationEnabled ? 'Location Context: On' : 'Location Context: Off'}
          >
            {isLocationEnabled ? <MapPin size={18} /> : <MapPinOff size={18} />}
          </button>

          {/* Level Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLevelMenu(!showLevelMenu)}
              className="h-10 px-4 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white hover:bg-black/40 transition-all active:scale-95"
            >
              <span className="text-xs font-semibold">{userLevel}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${
                  showLevelMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showLevelMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-1.5 flex flex-col gap-1 min-w-[140px] animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right z-50">
                {(['Beginner', 'Intermediate', 'Advanced'] as UserLevel[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setUserLevel(l);
                      setShowLevelMenu(false);
                    }}
                    className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                      userLevel === l
                        ? 'bg-black/10 text-black'
                        : 'text-gray-800 hover:bg-black/5'
                    }`}
                  >
                    {l}
                    {userLevel === l && <Check size={14} className="text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sliding Toolbar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col justify-end pb-8 bg-gradient-to-t from-black/70 via-black/20 to-transparent pt-20">
        <div
          ref={scrollContainerRef}
          className="flex items-center w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Spacers */}
          <div className="min-w-[calc(50vw-40px)] spacer snap-none shrink-0" />

          {modes.map((m) => {
            const isActive = activeMode === m.id;
            return (
              <div
                key={m.id}
                data-mode={m.id}
                className="snap-center shrink-0 w-20 mx-2 flex flex-col items-center justify-center relative h-28"
                onClick={() => {
                  if (isActive) handleMainAction();
                  else {
                    const container = scrollContainerRef.current;
                    const el = container?.querySelector(
                      `[data-mode="${m.id}"]`
                    ) as HTMLElement;
                    if (container && el) {
                      container.scrollTo({
                        left:
                          el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2,
                        behavior: 'smooth',
                      });
                    }
                  }
                }}
              >
                <div
                  className={`
                    rounded-full flex items-center justify-center transition-all duration-300 ease-out
                    ${
                      isActive
                        ? 'w-16 h-16 shadow-lg transform translate-y-0'
                        : 'w-10 h-10 opacity-70 hover:opacity-100 transform translate-y-2'
                    }
                    ${
                      isActive && m.id === 'camera'
                        ? 'border-[4px] border-white bg-transparent'
                        : ''
                    }
                    ${
                      isActive && m.id === 'voice'
                        ? 'border-[4px] border-red-500 bg-red-500/10'
                        : ''
                    }
                    ${
                      isActive && m.id === 'upload'
                        ? 'bg-white/20 border-[2px] border-white/50 backdrop-blur-md'
                        : ''
                    }
                  `}
                >
                  {/* Inner Content */}
                  {m.id === 'camera' && isActive ? (
                    <div className="w-12 h-12 bg-white rounded-full active:scale-90 transition-transform flex items-center justify-center">
                      {isFetchingLocation && (
                        <Loader2 size={24} className="text-black animate-spin" />
                      )}
                    </div>
                  ) : m.id === 'voice' && isActive ? (
                    <div
                      className={`rounded-full flex items-center justify-center ${
                        isRecording ? 'w-8 h-8 bg-red-500 rounded-sm' : 'w-12 h-12 bg-red-500'
                      }`}
                    >
                      {isFetchingLocation && !isRecording ? (
                        <Loader2 size={24} className="text-white animate-spin" />
                      ) : (
                        <Mic
                          size={isRecording ? 16 : 24}
                          className="text-white"
                        />
                      )}
                    </div>
                  ) : (
                    <m.icon
                      size={isActive ? 28 : 20}
                      className={`transition-colors drop-shadow-md ${
                        isActive ? 'text-white' : 'text-white'
                      }`}
                    />
                  )}
                </div>

                {/* Floating Label */}
                <span
                  className={`
                    absolute bottom-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-black/50 drop-shadow-sm
                    transition-all duration-300 transform
                    ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  `}
                >
                  {m.label}
                </span>
              </div>
            );
          })}

          <div className="min-w-[calc(50vw-40px)] spacer snap-none shrink-0" />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
