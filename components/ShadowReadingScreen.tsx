'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  Mic,
  Square,
  Volume2,
  Trash2,
  ChevronLeft,
  Check,
  AlertCircle,
  RotateCw,
  History,
  ChevronLeft as BackIcon,
  Users,
} from 'lucide-react';
import type { UserLevel, PracticeMode } from '@/lib/types';
import type {
  ShadowDailyChallenge,
  ShadowAnalysisResult,
  ShadowWordAnalysis,
  ShadowHistoryEntry,
} from '@/lib/types';
import { getCachedChallenge, getInFlightRequest, clearShadowCache } from '@/lib/shadowCache';
import { getShadowHistory, addShadowHistoryEntry } from '@/lib/utils/shadowHistory';
import { storage } from '@/lib/utils/storage';

const SHADOW_SOURCE_FILE_KEY = 'speakSnapShadowSourceFile';
import { ShadowYouTubeCard } from './ShadowYouTubeCard';
import { ShadowMultiAudioMode } from './ShadowMultiAudioMode';

type ShadowState =
  | 'loading'
  | 'error'
  | 'ready'
  | 'recording'
  | 'has_recording'
  | 'analyzing'
  | 'results';

type AudioMode = 'single' | 'multi';

interface ShadowReadingScreenProps {
  userLevel: UserLevel;
  practiceMode: PracticeMode;
}

export default function ShadowReadingScreen({ userLevel, practiceMode }: ShadowReadingScreenProps) {
  const [state, setState] = useState<ShadowState>('loading');
  const [audioMode, setAudioMode] = useState<AudioMode>('single');
  const [challenge, setChallenge] = useState<ShadowDailyChallenge | null>(null);
  const [refAudioBase64, setRefAudioBase64] = useState<string | null>(null);
  const [refAudioUrl, setRefAudioUrl] = useState<string | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<ShadowAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [historyEntries, setHistoryEntries] = useState<ShadowHistoryEntry[]>([]);
  const [historyView, setHistoryView] = useState<'closed' | 'list' | 'detail'>('closed');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const refAudioUrlRef = useRef<string | null>(null);
  const userAudioUrlRef = useRef<string | null>(null);
  const loadChallengeAbortRef = useRef<AbortController | null>(null);
  const refAudioDurationRef = useRef<number>(0);
  const userAudioDurationRef = useRef<number>(0);

  const loadChallenge = useCallback(async () => {
    // IELTS + uploaded file: use file as source, skip cache
    const sourceFile =
      practiceMode === 'IELTS'
        ? await storage.getItem<{ uri: string; mimeType?: string; displayName?: string }>(SHADOW_SOURCE_FILE_KEY)
        : null;
    const useFileSource = Boolean(sourceFile?.uri);

    // Sync cache check: avoid loading state when we have data (skip cache when using file)
    const cached = !useFileSource ? getCachedChallenge(userLevel, practiceMode) : null;
    if (cached) {
      setError(null);
      setAnalysis(null);
      setUserAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        userAudioUrlRef.current = null;
        return null;
      });
      setUserAudioBlob(null);
      setRefAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        refAudioUrlRef.current = null;
        return null;
      });
      setRefAudioBase64(null);
      setChallenge({ topic: cached.topic, text: cached.text, sourceUrl: cached.sourceUrl });
      setRefAudioBase64(cached.refAudioBase64);
      if (cached.refAudioBase64) {
        const binary = atob(cached.refAudioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);
        if (refAudioUrlRef.current) URL.revokeObjectURL(refAudioUrlRef.current);
        refAudioUrlRef.current = blobUrl;
        setRefAudioUrl(blobUrl);
        const audio = new Audio(blobUrl);
        audio.onloadedmetadata = () => {
          refAudioDurationRef.current = audio.duration;
        };
      }
      setState('ready');
      return;
    }

    setState('loading');
    setError(null);
    setAnalysis(null);
    setUserAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      userAudioUrlRef.current = null;
      return null;
    });
    setUserAudioBlob(null);
    setRefAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      refAudioUrlRef.current = null;
      return null;
    });
    setRefAudioBase64(null);
    setChallenge(null);

    const ac = new AbortController();
    loadChallengeAbortRef.current = ac;
    try {
      let data: { topic: string; text: string; sourceUrl?: string; refAudioBase64: string };
      const inFlight = !useFileSource ? getInFlightRequest() : null;
      if (inFlight) {
        const result = await inFlight;
        if (ac.signal.aborted) return;
        data = {
          topic: result.topic,
          text: result.text,
          sourceUrl: result.sourceUrl,
          refAudioBase64: result.refAudioBase64,
        };
      } else {
        const url =
          typeof window !== 'undefined'
            ? `${window.location.origin}/api/shadow/challenge`
            : '/api/shadow/challenge';
        const body: { level: UserLevel; mode: PracticeMode; fileUri?: string; mimeType?: string; displayName?: string } =
          { level: userLevel, mode: practiceMode };
        if (useFileSource && sourceFile) {
          body.fileUri = sourceFile.uri;
          if (sourceFile.mimeType) body.mimeType = sourceFile.mimeType;
          if (sourceFile.displayName) body.displayName = sourceFile.displayName;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        const resData = (await res.json()) as {
          topic?: string;
          text?: string;
          sourceUrl?: string;
          refAudioBase64?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(resData.error || 'Failed to load challenge');
        data = {
          topic: resData.topic!,
          text: resData.text!,
          sourceUrl: resData.sourceUrl,
          refAudioBase64: resData.refAudioBase64!,
        };
      }

      if (ac.signal.aborted) return;
      setChallenge({ topic: data.topic, text: data.text, sourceUrl: data.sourceUrl });
      setRefAudioBase64(data.refAudioBase64);
      if (data.refAudioBase64) {
        const binary = atob(data.refAudioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);
        if (refAudioUrlRef.current) URL.revokeObjectURL(refAudioUrlRef.current);
        refAudioUrlRef.current = blobUrl;
        setRefAudioUrl(blobUrl);
        const audio = new Audio(blobUrl);
        audio.onloadedmetadata = () => {
          refAudioDurationRef.current = audio.duration;
        };
      }
      setState('ready');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      if (ac.signal.aborted) return;
      console.error(e);
      clearShadowCache();
      const msg = e instanceof Error ? e.message : 'Unable to load challenge.';
      const isNetworkError =
        msg.includes('fetch failed') ||
        msg.includes('Failed to fetch') ||
        (e instanceof TypeError && msg.toLowerCase().includes('fetch'));
      setError(isNetworkError ? 'Network error. Check your connection and try again.' : msg);
      setState('error');
    }
  }, [userLevel, practiceMode]);

  useEffect(() => {
    loadChallenge();
    return () => {
      loadChallengeAbortRef.current?.abort();
      loadChallengeAbortRef.current = null;
      if (refAudioUrlRef.current) {
        URL.revokeObjectURL(refAudioUrlRef.current);
        refAudioUrlRef.current = null;
      }
      if (userAudioUrlRef.current) {
        URL.revokeObjectURL(userAudioUrlRef.current);
        userAudioUrlRef.current = null;
      }
    };
  }, [loadChallenge]);

  useEffect(() => {
    getShadowHistory().then(setHistoryEntries);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const options: MediaRecorderOptions = { audioBitsPerSecond: 128000 };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = mr.mimeType || options.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        if (userAudioUrlRef.current) URL.revokeObjectURL(userAudioUrlRef.current);
        userAudioUrlRef.current = url;
        setUserAudioBlob(blob);
        setUserAudioUrl(url);
        // Get user audio duration
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          userAudioDurationRef.current = audio.duration;
        };
        setState('has_recording');
      };

      // 250ms timeslice: more reliable data on Safari/iOS; 100ms can yield empty chunks
      mr.start(250);
      setState('recording');
    } catch (e) {
      console.error(e);
      setError('Microphone access denied.');
      setState('ready');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  const resetRecording = () => {
    if (userAudioUrlRef.current) {
      URL.revokeObjectURL(userAudioUrlRef.current);
      userAudioUrlRef.current = null;
    }
    setUserAudioUrl(null);
    setUserAudioBlob(null);
    setState('ready');
  };

  const runAnalysis = async () => {
    if (!userAudioBlob || !challenge || !refAudioBase64) return;

    setState('analyzing');
    setError(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(userAudioBlob);
      });

      const res = await fetch('/api/shadow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAudioBase64: base64,
          userMimeType: userAudioBlob.type,
          refAudioBase64,
          refText: challenge.text,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      setAnalysis(data);
      setState('results');
      await addShadowHistoryEntry(
        { topic: challenge.topic, text: challenge.text, sourceUrl: challenge.sourceUrl },
        data
      );
      const list = await getShadowHistory();
      setHistoryEntries(list);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Analysis failed.');
      setState('has_recording');
    }
  };

  const nextChallenge = () => {
    loadChallenge();
  };

  const refreshChallenge = useCallback(() => {
    clearShadowCache();
    loadChallenge();
  }, [loadChallenge]);

  const playAudioSegment = (audioUrl: string, startTime: number, endTime: number): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      audio.currentTime = Math.max(0, startTime);
      audio.play();
      const checkTime = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          resolve();
        }
      };
      audio.ontimeupdate = checkTime;
      audio.onended = () => resolve();
    });
  };

  const handleWordClick = useCallback(
    async (wordIndex: number, word: string) => {
      if (!refAudioUrl || !userAudioUrl || !analysis) return;
      const wordData = analysis.words[wordIndex];
      if (!wordData) return;

      // Use precise timestamps if available, otherwise fall back to linear estimation
      let userStart: number, userEnd: number, refStart: number, refEnd: number;

      if (
        typeof wordData.userStartTime === 'number' &&
        typeof wordData.userEndTime === 'number' &&
        typeof wordData.refStartTime === 'number' &&
        typeof wordData.refEndTime === 'number'
      ) {
        // Use precise timestamps from Gemini
        userStart = wordData.userStartTime;
        userEnd = wordData.userEndTime;
        refStart = wordData.refStartTime;
        refEnd = wordData.refEndTime;
      } else {
        // Fallback: linear estimation
        const totalWords = analysis.words.length;
        const refDuration = refAudioDurationRef.current || 10;
        const userDuration = userAudioDurationRef.current || 10;
        const wordRatio = wordIndex / totalWords;
        const segmentDuration = 0.8;
        userStart = wordRatio * userDuration;
        userEnd = userStart + segmentDuration;
        refStart = wordRatio * refDuration;
        refEnd = refStart + segmentDuration;
      }

      // Play user segment first, then reference segment (user wants to hear their pronunciation first)
      try {
        await playAudioSegment(userAudioUrl, userStart, userEnd);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await playAudioSegment(refAudioUrl, refStart, refEnd);
      } catch (err) {
        console.error('Error playing audio segment:', err);
      }
    },
    [refAudioUrl, userAudioUrl, analysis]
  );

  /* if (state === 'loading') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-primary-50">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
          <Loader2 size={48} className="text-primary-900 animate-spin relative z-10" />
        </div>
        <h2 className="text-xl font-bold text-primary-900 mb-1">Loading challenge...</h2>
        <p className="text-gray-500 text-sm">Adapting to {userLevel} level.</p>
      </div>
    );
  } */

  if (state === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-primary-50">
        <div className="bg-white rounded-2xl p-6 shadow-float border border-red-100 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-primary-900 font-medium mb-4">{error}</p>
          <button
            onClick={loadChallenge}
            className="w-full bg-primary-900 text-white py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="h-full bg-primary-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary-900/40" aria-hidden />
      </div>
    );
  }

  // Multi-audio mode
  if (audioMode === 'multi' && refAudioBase64) {
    return (
      <ShadowMultiAudioMode
        challenge={challenge}
        refAudioBase64={refAudioBase64}
        onBack={() => setAudioMode('single')}
      />
    );
  }

  const selectedEntry = selectedHistoryId
    ? historyEntries.find((e) => e.id === selectedHistoryId)
    : null;

  if (historyView === 'list') {
    return (
      <div className="h-full bg-primary-50 flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="flex-1 px-4 py-6 pb-24 safe-bottom">
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              type="button"
              onClick={() => setHistoryView('closed')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-900 font-medium touch-manipulation min-h-[44px]"
              aria-label="Back to challenge"
            >
              <BackIcon size={18} />
              Back
            </button>
            <h2 className="text-lg font-semibold text-primary-900">Past Analyses</h2>
            <div className="w-14" aria-hidden />
          </div>
          {historyEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-float border border-black/5 text-center text-gray-500 text-sm">
              No past analyses yet. Complete an analysis to see it here.
            </div>
          ) : (
            <ul className="space-y-3">
              {historyEntries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryId(entry.id);
                      setHistoryView('detail');
                    }}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-float border border-black/5 hover:border-primary-200 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-primary-900 truncate flex-1">
                        {entry.challenge.topic}
                      </span>
                      <span
                        className={`text-sm font-bold shrink-0 ${
                          entry.analysis.score > 80
                            ? 'text-green-600'
                            : entry.analysis.score > 60
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {entry.analysis.score}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      &quot;{entry.challenge.text}&quot;
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (historyView === 'detail' && selectedEntry) {
    const entryAnalysis = selectedEntry.analysis;
    const entryCards = [
      { id: 'score', title: 'Overall Score', type: 'score' as const },
      { id: 'feedback', title: "Coach's Feedback", type: 'feedback' as const },
      { id: 'strengths', title: 'Strengths', type: 'strengths' as const },
      { id: 'improvements', title: 'Improvements', type: 'improvements' as const },
      { id: 'youtube', title: 'Pronunciation Guides', type: 'youtube' as const },
    ];
    return (
      <div className="h-full bg-primary-50 flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="flex-1 px-4 py-6 pb-24 safe-bottom">
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setSelectedHistoryId(null);
                setHistoryView('list');
              }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-900 font-medium touch-manipulation min-h-[44px]"
              aria-label="Back to list"
            >
              <BackIcon size={18} />
              Back
            </button>
            <h2 className="text-lg font-semibold text-primary-900 truncate flex-1 text-center">
              {selectedEntry.challenge.topic}
            </h2>
            <div className="w-14" aria-hidden />
          </div>
          <div className="max-w-xl mx-auto space-y-6">
            <p className="text-xs text-gray-500 text-center">
              {new Date(selectedEntry.timestamp).toLocaleString()}
            </p>
            <WordAnalysisView words={entryAnalysis.words} />
            <div className="flex flex-col gap-4">
              {entryCards.map((card) => (
                <div key={card.id} className="w-full">
                  {card.type === 'youtube' ? (
                    <ShadowYouTubeCard
                      words={entryAnalysis.words || []}
                      weaknesses={entryAnalysis.pronunciation?.weaknesses || []}
                      title={card.title}
                    />
                  ) : (
                    <SummaryCard analysis={entryAnalysis} card={card} />
                  )}
                </div>
              ))}
            </div>
            {selectedEntry.challenge.sourceUrl && (
              <div className="flex justify-center pt-2">
                <a
                  href={selectedEntry.challenge.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-gray-300 hover:text-gray-500 uppercase tracking-widest"
                >
                  Content Source
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const summaryCards = analysis
    ? [
        { id: 'score', title: 'Overall Score', type: 'score' as const },
        { id: 'feedback', title: "Coach's Feedback", type: 'feedback' as const },
        { id: 'strengths', title: 'Strengths', type: 'strengths' as const },
        { id: 'improvements', title: 'Improvements', type: 'improvements' as const },
        { id: 'youtube', title: 'Pronunciation Guides', type: 'youtube' as const },
      ]
    : [];

  return (
    <div className="h-full bg-primary-50 flex flex-col overflow-y-auto overflow-x-hidden">
      <div className="flex-1 px-4 py-6 pb-32 safe-bottom">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center gap-3 w-full max-w-xl mx-auto">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryView('list')}
                  className="p-2 rounded-full text-gray-400 hover:text-primary-900 hover:bg-white/80 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="View past analyses"
                  title="Past analyses"
                >
                  <History size={20} />
                </button>
              </div>
              <h2 className="flex-1 text-center text-base font-semibold text-primary-900 truncate px-2">
                {challenge.topic}
              </h2>
              <button
                type="button"
                onClick={refreshChallenge}
                className="p-2 rounded-full text-gray-400 hover:text-primary-900 hover:bg-white/80 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="Refresh challenge"
              >
                <RotateCw size={20} />
              </button>
            </div>
            
            {/* Mode Selector */}
            {(state === 'ready' || state === 'results') && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAudioMode('single')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    audioMode === 'single'
                      ? 'bg-primary-900 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-black/5'
                  }`}
                >
                  Single Mode
                </button>
                <button
                  type="button"
                  onClick={() => setAudioMode('multi')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    audioMode === 'multi'
                      ? 'bg-primary-900 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-black/5'
                  }`}
                >
                  <Users size={16} />
                  Compare Mode
                </button>
              </div>
            )}

            {state === 'results' && analysis ? (
              <>
                <WordAnalysisView words={analysis.words} onWordClick={handleWordClick} />
                <p className="text-xs text-gray-400 text-center mt-2">
                  Tap any word to hear: Your pronunciation → Reference pronunciation
                </p>
              </>
            ) : (
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight leading-tight text-primary-900 px-2">
                &quot;{challenge.text}&quot;
              </h1>
            )}

            {refAudioUrl && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => new Audio(refAudioUrl!).play()}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-900 transition-colors touch-manipulation min-h-[44px]"
                >
                  <Volume2 size={18} />
                  <span>Play Native Reference</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-black/5" />

          <div className="w-full max-w-xl mx-auto space-y-6">
            {!userAudioUrl ? (
              <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5">
                <div className="flex flex-col items-center gap-4">
                  {state === 'recording' ? (
                    <>
                      <div className="flex items-end justify-center gap-1 h-8" aria-hidden>
                        {[0, 0.12, 0.08, 0.16, 0.06, 0.14, 0.1, 0.18, 0.04].map((d, i) => (
                          <div
                            key={i}
                            className="w-1 h-5 rounded-full bg-apple-blue recording-wave shadow-sm"
                            style={{ animationDelay: `${d}s` }}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-600">Recording...</p>
                      <p className="text-xs text-gray-400">Tap the button below to stop</p>
                    </>
                  ) : (
                    <div className="w-full h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-black/5">
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-sm font-medium">Ready to record</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Your Recording</span>
                  <button
                    type="button"
                    onClick={resetRecording}
                    className="text-xs text-gray-400 hover:text-red-500 touch-manipulation min-h-[44px] min-w-[44px] flex items-center"
                  >
                    Delete
                  </button>
                </div>
                <audio controls src={userAudioUrl} className="w-full h-10" />
                {state === 'has_recording' && (
                  <div className="pt-2">
                    {error && (
                      <p className="text-red-500 text-sm mb-2">{error}</p>
                    )}
                    <button
                      type="button"
                      onClick={runAnalysis}
                      className="w-full bg-primary-900 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      Analyze Pronunciation
                    </button>
                  </div>
                )}
                {state === 'analyzing' && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 size={20} className="animate-spin text-primary-900" />
                    <span className="text-sm text-gray-600">Analyzing...</span>
                  </div>
                )}
              </div>
            )}

            {analysis && state === 'results' && (
              <>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Summary
                </div>
                <div className="flex flex-col gap-4">
                  {summaryCards.map((card) => (
                    <div key={card.id} className="w-full">
                      {card.type === 'youtube' ? (
                        <ShadowYouTubeCard
                          words={analysis.words || []}
                          weaknesses={analysis.pronunciation?.weaknesses || []}
                          title={card.title}
                        />
                      ) : (
                        <SummaryCard analysis={analysis} card={card} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="pt-6 text-center">
                  <button
                    type="button"
                    onClick={nextChallenge}
                    className="text-sm text-gray-500 hover:text-primary-900 font-medium"
                  >
                    Next Challenge →
                  </button>
                </div>
              </>
            )}
          </div>

          {challenge.sourceUrl && (
            <div className="flex justify-center pt-4">
              <a
                href={challenge.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-gray-300 hover:text-gray-500 uppercase tracking-widest"
              >
                Content Source
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Fixed recording button – same style as Library FAB */}
      {(state === 'ready' || state === 'recording') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 safe-bottom">
          {state === 'recording' ? (
            <button
              type="button"
              onClick={stopRecording}
              className="bg-primary-900 text-white px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 touch-manipulation min-h-[44px]"
              aria-label="Stop recording"
            >
              <Square size={18} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="bg-primary-900 text-white px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 touch-manipulation min-h-[44px]"
              aria-label="Start recording"
            >
              <Mic size={18} />
              <span>Start Recording</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WordAnalysisView({
  words,
  onWordClick,
}: {
  words: ShadowWordAnalysis[];
  onWordClick?: (wordIndex: number, word: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-3 leading-relaxed justify-center max-w-2xl mx-auto px-2">
      {words.map((w, idx) => {
        let statusColor = 'text-primary-900';
        let statusDecor = '';

        if (w.status === 'poor') {
          statusColor = 'text-red-600 font-semibold';
          statusDecor =
            'decoration-red-200 underline decoration-2 underline-offset-4 cursor-pointer';
        } else if (w.status === 'average') {
          statusColor = 'text-amber-600';
          statusDecor =
            'decoration-amber-200 underline decoration-2 underline-offset-4 cursor-pointer';
        } else {
          statusColor = 'text-emerald-700 cursor-pointer';
        }

        return (
          <span
            key={idx}
            className="relative group inline-block"
            onClick={() => onWordClick?.(idx, w.word)}
          >
            <span className={`text-xl md:text-2xl transition-colors ${statusColor} ${statusDecor}`}>
              {w.word}
            </span>
            {w.status !== 'good' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-primary-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                {w.phonetic && (
                  <div className="font-mono text-gray-300 mb-1">{w.phonetic}</div>
                )}
                <div>{w.issue}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary-900" />
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}

function SummaryCard({
  analysis,
  card,
}: {
  analysis: ShadowAnalysisResult;
  card: { id: string; title: string; type: 'score' | 'feedback' | 'strengths' | 'improvements' | 'youtube' };
}) {
  const { type } = card;

  if (type === 'score') {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">
          Overall Score
        </span>
        <div className="text-5xl font-bold tracking-tighter text-primary-900 mb-2">
          {analysis.score}
        </div>
        <div
          className={`text-sm font-medium px-2 py-1 rounded-full ${
            analysis.score > 80
              ? 'bg-green-100 text-green-700'
              : analysis.score > 60
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {analysis.score > 80 ? 'Excellent' : analysis.score > 60 ? 'Good Effort' : 'Needs Practice'}
        </div>
      </div>
    );
  }

  if (type === 'feedback') {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5 flex flex-col">
        <h3 className="text-sm font-semibold text-primary-900 mb-4">Coach&apos;s Feedback</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{analysis.suggestions}</p>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-gray-400 font-medium mb-1">Fluency</span>
            <span className="text-primary-900">{analysis.fluency}</span>
          </div>
          <div>
            <span className="block text-gray-400 font-medium mb-1">Intonation</span>
            <span className="text-primary-900">{analysis.intonation}</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'strengths') {
    const strengths = analysis.pronunciation?.strengths || [];
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Strengths
        </h4>
        <ul className="space-y-2">
          {strengths.length > 0 ? (
            strengths.map((s, i) => (
              <li key={i} className="flex items-start text-sm text-primary-900">
                <Check size={16} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                {s}
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-400 italic">Analysis data not available.</li>
          )}
        </ul>
      </div>
    );
  }

  if (type === 'improvements') {
    const weaknesses = analysis.pronunciation?.weaknesses || [];
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Improvements
        </h4>
        <ul className="space-y-2">
          {weaknesses.length > 0 ? (
            weaknesses.map((w, i) => (
              <li key={i} className="flex items-start text-sm text-primary-900">
                <AlertCircle size={16} className="text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                {w}
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-400 italic">No major issues detected.</li>
          )}
        </ul>
      </div>
    );
  }

  return null;
}
