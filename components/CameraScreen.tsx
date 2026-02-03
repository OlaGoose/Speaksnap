'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { UserLevel, PracticeMode, PreferredModel, Scenario } from '@/lib/types';
import { storage } from '@/lib/utils/storage';
import { SETTINGS_KEYS } from '@/lib/constants/settings';

type Mode = 'voice' | 'camera' | 'upload';

export default function CameraScreen() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isScrollInitialized, setIsScrollInitialized] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const [userLevel, setUserLevel] = useState<UserLevel>('Beginner');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('Daily');
  const [preferredModel, setPreferredModel] = useState<PreferredModel>('Auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const [savedLevel, savedMode, savedModel, savedLocation] = await Promise.all([
        storage.getItem<UserLevel>(SETTINGS_KEYS.level),
        storage.getItem<PracticeMode>(SETTINGS_KEYS.practiceMode),
        storage.getItem<PreferredModel>(SETTINGS_KEYS.preferredModel),
        storage.getItem<boolean>(SETTINGS_KEYS.locationEnabled),
      ]);
      if (savedLevel) setUserLevel(savedLevel);
      if (savedMode) setPracticeMode(savedMode);
      if (savedModel) setPreferredModel(savedModel);
      if (savedLocation != null) setIsLocationEnabled(savedLocation);
    })();
  }, []);

  useEffect(() => {
    storage.setItem(SETTINGS_KEYS.level, userLevel);
  }, [userLevel]);

  useEffect(() => {
    storage.setItem(SETTINGS_KEYS.practiceMode, practiceMode);
  }, [practiceMode]);

  useEffect(() => {
    storage.setItem(SETTINGS_KEYS.preferredModel, preferredModel);
  }, [preferredModel]);

  const handleLocationToggle = () => {
    const next = !isLocationEnabled;
    setIsLocationEnabled(next);
    storage.setItem(SETTINGS_KEYS.locationEnabled, next);
  };

  // Handle image capture and analysis
  const handleCapture = async (imageSrc: string, location?: { lat: number; lng: number }) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageSrc,
          level: userLevel,
          mode: practiceMode,
          location,
          preferredModel,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      const newScenario: Scenario = {
        id: Date.now().toString(),
        image_url: imageSrc,
        location: result.location,
        situation: result.situation,
        difficulty: result.difficulty,
        role_name: result.role_name,
        context: result.context,
        goals: result.goals,
        completion_phrase: result.completion_phrase,
        timestamp: Date.now(),
        dialogues: [],
        total_attempts: 0,
        best_score: 0,
        last_practiced: Date.now(),
      };

      // Save new scenario immediately
      const scenarios = await storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      await storage.setItem('speakSnapScenarios', [newScenario, ...scenarios]);

      setIsAnalyzing(false);
      router.push(`/dialogue/${newScenario.id}`);
    } catch (error: any) {
      console.error('Failed to analyze image:', error);
      setIsAnalyzing(false);
      
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('timeout')) {
        alert('Image analysis timeout. Please check your internet connection and try again.');
      } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        alert('Network connection failed. Please check your internet and try again.');
      } else {
        alert('Could not analyze image. Please try again with a different image.');
      }
    }
  };

  // Handle voice capture and analysis
  const handleVoiceCapture = async (audioBase64: string, location?: { lat: number; lng: number }) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          level: userLevel,
          mode: practiceMode,
          location,
          preferredModel,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      const newScenario: Scenario = {
        id: Date.now().toString(),
        location: result.location,
        situation: result.situation,
        difficulty: result.difficulty,
        role_name: result.role_name,
        context: result.context,
        goals: result.goals,
        completion_phrase: result.completion_phrase,
        timestamp: Date.now(),
        dialogues: [],
        total_attempts: 0,
        best_score: 0,
        last_practiced: Date.now(),
      };

      // Save new scenario immediately
      const scenarios = await storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      await storage.setItem('speakSnapScenarios', [newScenario, ...scenarios]);

      setIsAnalyzing(false);
      router.push(`/dialogue/${newScenario.id}`);
    } catch (error: any) {
      console.error('Failed to analyze audio:', error);
      setIsAnalyzing(false);
      
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('timeout')) {
        alert('Audio analysis timeout. Please check your internet connection and try again.');
      } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        alert('Network connection failed. Please check your internet and try again.');
      } else {
        alert('Could not understand audio. Please try recording again.');
      }
    }
  };

  // Initialize camera with retry and error handling
  useEffect(() => {
    let stream: MediaStream | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    const maxRetries = 3;

    const startCamera = async (retryAttempt = 0) => {
      try {
        // Stop any existing stream first
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          stream = null;
        }

        // Wait for video element to be ready
        if (!videoRef.current) {
          if (retryAttempt < maxRetries) {
            retryTimeout = setTimeout(() => startCamera(retryAttempt + 1), 100);
            return;
          }
          setError('Camera element not ready');
          return;
        }

        // Request camera access
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Set stream to video element
        videoRef.current.srcObject = stream;
        setIsCameraReady(false);
        setError(null);

        // Wait for video metadata to load
        const handleLoadedMetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((err) => {
              console.warn('Video play error:', err);
            });
            setIsCameraReady(true);
          }
        };

        // Wait for video to be ready
        if (videoRef.current.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher
          handleLoadedMetadata();
        } else {
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        }

        // Handle video errors
        const handleError = () => {
          console.error('Video element error');
          setError('Camera stream error');
          setIsCameraReady(false);
        };

        videoRef.current.addEventListener('error', handleError);

        // Cleanup error listener on unmount
        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoRef.current.removeEventListener('error', handleError);
          }
        };
      } catch (err: any) {
        console.error('Camera access error:', err);
        
        // Handle specific error types
        let errorMessage = 'Camera unavailable';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera permission denied. Please enable camera access in settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is being used by another app. Please close it and try again.';
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          // Try with simpler constraints
          if (retryAttempt < maxRetries) {
            console.log(`Retrying with simpler constraints (attempt ${retryAttempt + 1})`);
            retryTimeout = setTimeout(() => {
              startCamera(retryAttempt + 1);
            }, 500);
            return;
          }
          errorMessage = 'Camera constraints not supported.';
        } else if (err.name === 'AbortError') {
          errorMessage = 'Camera initialization was aborted.';
        }

        setError(errorMessage);
        setIsCameraReady(false);

        // Retry for certain errors
        if (
          (err.name === 'NotReadableError' || err.name === 'TrackStartError') &&
          retryAttempt < maxRetries
        ) {
          console.log(`Retrying camera access (attempt ${retryAttempt + 1}/${maxRetries})`);
          retryTimeout = setTimeout(() => {
            startCamera(retryAttempt + 1);
          }, 1000 * (retryAttempt + 1)); // Exponential backoff
        }
      }
    };

    // Start camera initialization
    startCamera();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraRetryCount]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
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

  // Auto-scroll to camera on mount - ensure immediate centering
  useEffect(() => {
    const scrollToCenter = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const cameraEl = container.querySelector('[data-mode="camera"]') as HTMLElement;
        if (cameraEl && cameraEl.offsetWidth > 0) {
          // Disable smooth scrolling for instant positioning
          container.style.scrollBehavior = 'auto';
          
          const scrollLeft = cameraEl.offsetLeft - container.offsetWidth / 2 + cameraEl.offsetWidth / 2;
          container.scrollLeft = scrollLeft;
          
          // Restore smooth scrolling and show the container
          container.style.scrollBehavior = 'smooth';
          setIsScrollInitialized(true);
          return true;
        }
      }
      return false;
    };

    // Try multiple times with increasing delays to ensure DOM is ready
    const attempts = [0, 10, 50, 100];
    attempts.forEach((delay) => {
      setTimeout(() => {
        if (!isScrollInitialized) {
          scrollToCenter();
        }
      }, delay);
    });
  }, [isScrollInitialized]);

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
    // Check if camera is ready
    if (!isCameraReady || error) {
      console.warn('Camera not ready, cannot take photo');
      return;
    }

    if (videoRef.current && canvasRef.current) {
      // Ensure video has valid dimensions
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        console.warn('Video dimensions not ready');
        return;
      }

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

        // 优化：使用更高效的压缩质量，在质量和大小之间取得更好平衡
        handleCapture(tempCanvas.toDataURL('image/jpeg', 0.8), location);
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
            handleCapture(canvas.toDataURL('image/jpeg', 0.7), location);
          };
          img.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
    } else {
      // Start recording
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
            handleVoiceCapture(reader.result as string, location);
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        
        // Start timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
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

  const handleRetryCamera = () => {
    setError(null);
    setIsCameraReady(false);
    setCameraRetryCount((prev) => prev + 1);
    // Trigger re-initialization by updating a dependency
  };

  const modes = [
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'camera', icon: Sparkles, label: 'Camera' },
    { id: 'upload', icon: ImageIcon, label: 'Upload' },
  ];

  // Show analyzing screen
  if (isAnalyzing) {
    return (
      <div className="h-full w-full bg-primary-50 text-primary-900 flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <Loader2 size={48} className="text-primary-900 animate-spin relative z-10" />
        </div>
        <h2 className="text-xl font-bold mb-2">Creating Scenario...</h2>
        <p className="text-gray-500 text-sm">Adapting to {userLevel} level.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col select-none text-white [font-size:130%]">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 bg-black">
        {!error ? (
          <>
            {/* Loading overlay */}
            {!isCameraReady && (
              <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={42} className="text-white animate-spin" />
                  <p className="text-white/80 text-sm font-medium">Initializing camera...</p>
                </div>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                activeMode === 'voice' ? 'blur-2xl opacity-60 scale-105' : 'opacity-100'
              } ${!isCameraReady ? 'opacity-0' : 'opacity-100'}`}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                  setIsCameraReady(true);
                }
              }}
              onCanPlay={() => {
                setIsCameraReady(true);
              }}
            />

            {/* Voice Mode Visuals */}
            <div
              className={`absolute inset-0 flex items-center justify-center flex-col z-10 transition-opacity duration-500 pointer-events-none ${
                activeMode === 'voice' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Recording Waveform Animation */}
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    {[0.1, 0.2, 0.15, 0.25, 0.18, 0.22, 0.12].map((delay, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-4 bg-red-500 rounded-full recording-wave"
                        style={{
                          animationDelay: `${delay}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-[-20%] flex flex-col items-center gap-3">
                <p className="text-white/90 text-2xl font-light tracking-tight drop-shadow-md text-center px-6">
                  {isRecording ? '' : 'Tap mic to start recording'}
                </p>
                
                {/* Recording Duration */}
                {isRecording && (
                  <div className="flex items-center gap-2 px-4 py-2 mb-10 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white font-mono text-sm font-medium">
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              {isLocationEnabled && !isRecording && (
                <div className="mt-4 flex items-center gap-2 text-white/50 text-sm">
                  <MapPin size={23} />
                  <span>Location context active</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                  <circle cx="12" cy="13" r="3"></circle>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Camera Unavailable</h3>
                <p className="text-sm text-white/70 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={handleRetryCamera}
                className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white font-medium transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                </svg>
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="absolute top-4 left-0 right-0 p-6 z-20 flex justify-between items-start safe-area-top">
        <button
          onClick={() => router.push('/library')}
          className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/40 transition-all active:scale-95"
        >
          <History size={23} />
        </button>

        <div className="flex items-center gap-2">
          {/* Location Toggle */}
          <button
            onClick={handleLocationToggle}
            className={`h-10 w-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-95 ${
              isLocationEnabled
                ? 'bg-blue-500/30 text-blue-400'
                : 'bg-black/20 text-white/40'
            }`}
            title={isLocationEnabled ? 'Location Context: On' : 'Location Context: Off'}
          >
            {isLocationEnabled ? <MapPin size={23} /> : <MapPinOff size={23} />}
          </button>

          {/* Practice Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="h-10 px-4 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white hover:bg-black/40 transition-all active:scale-95"
            >
              <span className="text-sm font-semibold">{practiceMode}</span>
              <ChevronDown
                size={18}
                className={`transition-transform duration-300 ${
                  showModeMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showModeMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-1.5 flex flex-col gap-1 min-w-[120px] animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right z-50">
                {(['Daily', 'IELTS'] as PracticeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setPracticeMode(m);
                      setShowModeMenu(false);
                    }}
                    className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                      practiceMode === m
                        ? 'bg-black/10 text-black'
                        : 'text-gray-800 hover:bg-black/5'
                    }`}
                  >
                    {m}
                    {practiceMode === m && <Check size={18} className="text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Level Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLevelMenu(!showLevelMenu)}
              className="h-10 px-4 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white hover:bg-black/40 transition-all active:scale-95"
            >
              <span className="text-sm font-semibold">{userLevel}</span>
              <ChevronDown
                size={18}
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
                    {userLevel === l && <Check size={18} className="text-black" />}
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
          className="flex items-center w-full overflow-x-auto snap-x snap-mandatory no-scrollbar transition-opacity duration-300"
          style={{ 
            scrollBehavior: 'smooth',
            opacity: isScrollInitialized ? 1 : 0
          }}
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
                        ? 'bg-red-500/10'
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
                        <Loader2 size={31} className="text-black animate-spin" />
                      )}
                    </div>
                  ) : m.id === 'voice' && isActive ? (
                    <div
                      className={`flex items-center justify-center transition-all duration-300 ${
                        isRecording 
                          ? 'w-10 h-10 bg-red-500 rounded-md' 
                          : 'w-12 h-12 bg-red-500 rounded-full'
                      }`}
                    >
                      {isFetchingLocation && !isRecording ? (
                        <Loader2 size={31} className="text-white animate-spin" />
                      ) : isRecording ? (
                        // Stop icon (square)
                        <div className="w-5 h-5 bg-white rounded-sm" />
                      ) : (
                        // Microphone icon
                        <Mic size={31} className="text-white" />
                      )}
                    </div>
                  ) : (
                    <m.icon
                      size={isActive ? 36 : 26}
                      className={`transition-colors drop-shadow-md ${
                        isActive ? 'text-white' : 'text-white'
                      }`}
                    />
                  )}
                </div>

                {/* Floating Label */}
                <span
                  className={`
                    absolute bottom-0 text-[13px] font-bold uppercase tracking-[0.2em] text-white shadow-black/50 drop-shadow-sm
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
