'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Screen, Scenario, UserLevel } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { storage } from '@/lib/utils/storage';

// Lazy load heavy components for better initial load performance
const CameraScreen = lazy(() => import('@/components/CameraScreen'));
const DialogueScreen = lazy(() => import('@/components/DialogueScreen'));
const LibraryScreen = lazy(() => import('@/components/LibraryScreen'));

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.CAMERA);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [currentDialogueId, setCurrentDialogueId] = useState<string | undefined>(undefined);
  const [userLevel, setUserLevel] = useState<UserLevel>('Beginner');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initial setup
  useEffect(() => {
    // Load user level from localStorage
    const savedLevel = storage.getItem<UserLevel>('speakSnapLevel');
    if (savedLevel) {
      setUserLevel(savedLevel);
    }
  }, []);

  useEffect(() => {
    // Save user level
    storage.setItem('speakSnapLevel', userLevel);
  }, [userLevel]);

  const handleCapture = async (imageSrc: string, location?: { lat: number; lng: number }) => {
    setIsAnalyzing(true);
    setCurrentScreen(Screen.ANALYSIS);

    try {
      // Call AI service to analyze image
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageSrc,
          level: userLevel,
          location,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();

      const newScenario: Scenario = {
        id: Date.now().toString(),
        image_url: imageSrc,
        location: result.location,
        situation: result.situation,
        difficulty: result.difficulty,
        role_name: result.role_name,
        context: result.context,
        timestamp: Date.now(),
        dialogues: [],
        total_attempts: 0,
        best_score: 0,
        last_practiced: Date.now(),
      };

      // Save new scenario immediately
      const scenarios = storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      storage.setItem('speakSnapScenarios', [newScenario, ...scenarios]);

      setCurrentScenario(newScenario);
      setCurrentDialogueId(undefined); // New dialogue
      setIsAnalyzing(false);
      setCurrentScreen(Screen.DIALOGUE);
    } catch (error) {
      console.error('Failed to analyze image:', error);
      setIsAnalyzing(false);
      setCurrentScreen(Screen.CAMERA);
      alert('Could not analyze image. Please try again.');
    }
  };

  const handleVoiceCapture = async (audioBase64: string, location?: { lat: number; lng: number }) => {
    setIsAnalyzing(true);
    setCurrentScreen(Screen.ANALYSIS);

    try {
      const response = await fetch('/api/analyze-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          level: userLevel,
          location,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();

      const newScenario: Scenario = {
        id: Date.now().toString(),
        location: result.location,
        situation: result.situation,
        difficulty: result.difficulty,
        role_name: result.role_name,
        context: result.context,
        timestamp: Date.now(),
        dialogues: [],
        total_attempts: 0,
        best_score: 0,
        last_practiced: Date.now(),
      };

      // Save new scenario immediately
      const scenarios = storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      storage.setItem('speakSnapScenarios', [newScenario, ...scenarios]);

      setCurrentScenario(newScenario);
      setCurrentDialogueId(undefined); // New dialogue
      setIsAnalyzing(false);
      setCurrentScreen(Screen.DIALOGUE);
    } catch (error) {
      console.error('Failed to analyze audio:', error);
      setIsAnalyzing(false);
      setCurrentScreen(Screen.CAMERA);
      alert('Could not understand audio. Please try again.');
    }
  };

  // Loading fallback component
  const LoadingFallback = () => (
    <div className="h-full w-full bg-primary-50 text-primary-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <Loader2 size={48} className="text-primary-900 animate-spin relative z-10" />
      </div>
      <h2 className="text-xl font-bold mb-2">Loading...</h2>
    </div>
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.CAMERA:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CameraScreen
              onCapture={handleCapture}
              onVoiceCapture={handleVoiceCapture}
              onNavigate={setCurrentScreen}
              userLevel={userLevel}
              setUserLevel={setUserLevel}
            />
          </Suspense>
        );

      case Screen.ANALYSIS:
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

      case Screen.DIALOGUE:
        if (!currentScenario) return null;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DialogueScreen
              scenario={currentScenario}
              userLevel={userLevel}
              dialogueId={currentDialogueId}
              onBack={() => setCurrentScreen(Screen.LIBRARY)}
              onFinish={() => setCurrentScreen(Screen.LIBRARY)}
            />
          </Suspense>
        );

      case Screen.LIBRARY:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LibraryScreen
              onNavigate={setCurrentScreen}
              onSelectScenario={(scenario, dialogueId) => {
                setCurrentScenario(scenario);
                setCurrentDialogueId(dialogueId);
                setCurrentScreen(Screen.DIALOGUE);
              }}
            />
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-primary-50 overflow-hidden">
      {renderScreen()}
    </div>
  );
}
