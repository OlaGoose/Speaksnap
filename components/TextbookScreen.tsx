'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Loader2,
  Mic,
  Square,
  Volume2,
  ChevronLeft,
  Check,
  AlertCircle,
  BookOpen,
  RotateCw,
} from 'lucide-react';
import type { ShadowAnalysisResult, ShadowWordAnalysis } from '@/lib/types';
import { COURSES, type Lesson, type Course } from '@/lib/data/courses';
import { getCachedRefAudio, setCachedRefAudio, clearCachedRefAudio, clearCachedRefAudioForCourse } from '@/lib/textbookCache';

type TextbookView = 'list' | 'detail';
type DetailState = 'loading_audio' | 'ready' | 'recording' | 'has_recording' | 'analyzing' | 'results';

export default function TextbookScreen() {
  const [view, setView] = useState<TextbookView>('list');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(COURSES[0]?.id ?? 'nce2');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [detailState, setDetailState] = useState<DetailState>('loading_audio');
  const [refAudioBase64, setRefAudioBase64] = useState<string | null>(null);
  const [refAudioUrl, setRefAudioUrl] = useState<string | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<ShadowAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const refAudioUrlRef = useRef<string | null>(null);
  const userAudioUrlRef = useRef<string | null>(null);

  const currentCourse: Course | undefined = COURSES.find((c) => c.id === selectedCourseId);

  const applyRefAudio = useCallback((base64: string) => {
    setRefAudioBase64(base64);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const blobUrl = URL.createObjectURL(blob);
    if (refAudioUrlRef.current) URL.revokeObjectURL(refAudioUrlRef.current);
    refAudioUrlRef.current = blobUrl;
    setRefAudioUrl(blobUrl);
    setDetailState('ready');
  }, []);

  const loadLesson = useCallback(async (courseId: string, selected: Lesson, skipCache = false) => {
    setLesson(selected);
    setView('detail');
    setDetailState('loading_audio');
    setError(null);
    setRefAudioBase64(null);
    setRefAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      refAudioUrlRef.current = null;
      return null;
    });
    setUserAudioUrl(null);
    setUserAudioBlob(null);
    setAnalysis(null);
    if (userAudioUrlRef.current) {
      URL.revokeObjectURL(userAudioUrlRef.current);
      userAudioUrlRef.current = null;
    }

    try {
      if (!skipCache) {
        const cached = await getCachedRefAudio(courseId, selected.id);
        if (cached) {
          applyRefAudio(cached);
          return;
        }
      }

      const res = await fetch('/api/textbook/ref-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selected.text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load reference audio');
      const base64 = data.refAudioBase64 as string;
      await setCachedRefAudio(courseId, selected.id, base64);
      applyRefAudio(base64);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load audio');
      setDetailState('ready');
    }
  }, [applyRefAudio]);

  const handleRefreshLesson = useCallback(async () => {
    if (!lesson || !selectedCourseId) return;
    await clearCachedRefAudio(selectedCourseId, lesson.id);
    setDetailState('loading_audio');
    try {
      const res = await fetch('/api/textbook/ref-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lesson.text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load reference audio');
      const base64 = data.refAudioBase64 as string;
      await setCachedRefAudio(selectedCourseId, lesson.id, base64);
      applyRefAudio(base64);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to refresh audio');
      setDetailState('ready');
    }
  }, [lesson, selectedCourseId, applyRefAudio]);

  const handleRefreshCourse = useCallback(async () => {
    await clearCachedRefAudioForCourse(selectedCourseId);
  }, [selectedCourseId]);

  const startRecording = async () => {
    if (!lesson) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const options: MediaRecorderOptions = { audioBitsPerSecond: 128000 };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) options.mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) options.mimeType = 'audio/mp4';
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = mr.mimeType || options.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        if (userAudioUrlRef.current) URL.revokeObjectURL(userAudioUrlRef.current);
        userAudioUrlRef.current = url;
        setUserAudioBlob(blob);
        setUserAudioUrl(url);
        setDetailState('has_recording');
      };
      mr.start(250);
      setDetailState('recording');
    } catch (e) {
      console.error(e);
      setError('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
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
    setDetailState('ready');
  };

  const runAnalysis = async () => {
    if (!userAudioBlob || !lesson || !refAudioBase64) return;
    setDetailState('analyzing');
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(userAudioBlob);
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      const res = await fetch('/api/shadow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAudioBase64: base64,
          userMimeType: userAudioBlob.type,
          refAudioBase64,
          refText: lesson.text,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data);
      setDetailState('results');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Analysis failed.');
      setDetailState('has_recording');
    }
  };

  const backToList = () => {
    setView('list');
    setLesson(null);
    setRefAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      refAudioUrlRef.current = null;
      return null;
    });
    setUserAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      userAudioUrlRef.current = null;
      return null;
    });
    setRefAudioBase64(null);
    setUserAudioBlob(null);
    setAnalysis(null);
    setError(null);
  };

  // List view
  if (view === 'list') {
    const course = currentCourse ?? COURSES[0];
    const lessons = course?.lessons ?? [];
    return (
      <div className="h-full bg-primary-50 flex flex-col overflow-y-auto">
        <div className="flex-1 px-4 py-6 pb-24 safe-bottom">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={22} className="text-primary-900 shrink-0" />
              <h2 className="text-lg font-semibold text-primary-900">Textbook</h2>
            </div>

            {/* Course selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Course</p>
              <div className="flex gap-2 flex-wrap">
                {COURSES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
                      selectedCourseId === c.id
                        ? 'bg-primary-900 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-black/5'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-sm text-gray-600">
                  Tap a lesson to practice. Listen, record, then compare.
                </p>
                <button
                  type="button"
                  onClick={handleRefreshCourse}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-primary-900 hover:bg-white/80 border border-black/5 transition-colors touch-manipulation"
                  title="Refresh course (clear cached audio for this course)"
                >
                  <RotateCw size={14} />
                  Refresh
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {lessons.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => loadLesson(selectedCourseId, l)}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-float border border-black/5 hover:border-primary-200 transition-colors touch-manipulation"
                  >
                    <span className="text-xs text-gray-500 font-medium">Lesson {l.id}</span>
                    <p className="text-base font-semibold text-primary-900 mt-0.5">{l.title}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Detail view (lesson + record + analyze – same flow as Shadow)
  if (!lesson) return null;

  const summaryCards: { id: string; title: string; type: 'score' | 'feedback' | 'strengths' | 'improvements' }[] = analysis
    ? [
        { id: 'score', title: 'Overall Score', type: 'score' },
        { id: 'feedback', title: "Coach's Feedback", type: 'feedback' },
        { id: 'strengths', title: 'Strengths', type: 'strengths' },
        { id: 'improvements', title: 'Improvements', type: 'improvements' },
      ]
    : [];

  return (
    <div className="h-full bg-primary-50 flex flex-col overflow-y-auto overflow-x-hidden">
      <div className="flex-1 px-4 py-6 pb-32 safe-bottom">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center gap-2 w-full max-w-xl mx-auto">
              <button
                type="button"
                onClick={backToList}
                className="p-2 rounded-full text-gray-400 hover:text-primary-900 hover:bg-white/80 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="Back to lessons"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="flex-1 text-center text-base font-semibold text-primary-900 truncate px-2">
                Lesson {lesson.id}: {lesson.title}
              </h2>
              <button
                type="button"
                onClick={handleRefreshLesson}
                className="p-2 rounded-full text-gray-400 hover:text-primary-900 hover:bg-white/80 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="Refresh lesson (reload reference audio)"
                title="Refresh lesson"
              >
                <RotateCw size={20} />
              </button>
            </div>

            {detailState === 'loading_audio' && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 size={32} className="text-primary-900 animate-spin" />
                <p className="text-sm text-gray-500">Loading reference audio...</p>
              </div>
            )}

            {detailState !== 'loading_audio' && (
              <>
                {detailState === 'results' && analysis ? (
                  <>
                    <WordAnalysisView words={analysis.words} />
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Color-coded: <span className="text-emerald-700">Good</span> · <span className="text-amber-600">Average</span> · <span className="text-red-600">Needs Work</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-full max-h-[40vh] overflow-y-auto rounded-2xl bg-white/80 border border-black/5 px-4 py-4 text-left">
                      <p className="text-base md:text-lg font-medium tracking-tight leading-relaxed text-primary-900 whitespace-pre-wrap">
                        {lesson.text}
                      </p>
                    </div>
                    {refAudioUrl && detailState === 'ready' && (
                      <button
                        type="button"
                        onClick={() => new Audio(refAudioUrl!).play()}
                        className="mt-3 p-2 rounded-full text-gray-400 hover:text-primary-900 hover:bg-white/80 transition-colors touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                        aria-label="Play reference audio"
                      >
                        <Volume2 size={20} />
                      </button>
                    )}
                  </>
                )}

                {detailState === 'results' && refAudioUrl && userAudioUrl && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 shadow-sm border border-emerald-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Volume2 size={16} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-900">Reference (American male)</h3>
                          <p className="text-xs text-emerald-600">Listen & compare</p>
                        </div>
                      </div>
                      <audio controls src={refAudioUrl} className="w-full h-10 rounded-lg" />
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 shadow-sm border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <Mic size={16} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-blue-900">Your Recording</h3>
                          <p className="text-xs text-blue-600">Compare & practice</p>
                        </div>
                      </div>
                      <audio controls src={userAudioUrl} className="w-full h-10 rounded-lg" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="w-full h-px bg-black/5" />

          <div className="w-full max-w-xl mx-auto space-y-6">
            {detailState === 'recording' && (
              <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-end justify-center gap-1 h-8" aria-hidden>
                    {[0, 0.12, 0.08, 0.16, 0.06, 0.14, 0.1, 0.18, 0.04].map((d, i) => (
                      <div key={i} className="w-1 h-5 rounded-full bg-apple-blue recording-wave shadow-sm" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-gray-600">Recording...</p>
                  <p className="text-xs text-gray-400">Tap the button below to stop</p>
                </div>
              </div>
            )}

            {userAudioUrl && (detailState === 'has_recording' || detailState === 'analyzing') && (
              <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Your Recording</span>
                  {detailState === 'has_recording' && (
                    <button type="button" onClick={resetRecording} className="text-xs text-gray-400 hover:text-red-500 touch-manipulation min-h-[44px] min-w-[44px] flex items-center">
                      Delete
                    </button>
                  )}
                </div>
                <audio controls src={userAudioUrl} className="w-full h-10" />
                {detailState === 'has_recording' && (
                  <div className="pt-2">
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <button
                      type="button"
                      onClick={runAnalysis}
                      className="w-full bg-primary-900 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      Analyze Pronunciation
                    </button>
                  </div>
                )}
                {detailState === 'analyzing' && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 size={20} className="animate-spin text-primary-900" />
                    <span className="text-sm text-gray-600">Analyzing...</span>
                  </div>
                )}
              </div>
            )}

            {analysis && detailState === 'results' && (
              <>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Summary</div>
                <div className="flex flex-col gap-4">
                  {summaryCards.map((card) => (
                    <div key={card.id} className="w-full">
                      <SummaryCard analysis={analysis} card={card} />
                    </div>
                  ))}
                </div>
                <div className="pt-6 text-center">
                  <button type="button" onClick={backToList} className="text-sm text-gray-500 hover:text-primary-900 font-medium">
                    ← Back to Lessons
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {(detailState === 'ready' || detailState === 'recording') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 safe-bottom">
          {detailState === 'recording' ? (
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

function WordAnalysisView({ words }: { words: ShadowWordAnalysis[] }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-3 leading-relaxed justify-center max-w-2xl mx-auto px-2">
      {words.map((w, idx) => {
        let statusColor = 'text-primary-900';
        let statusDecor = '';
        if (w.status === 'poor') {
          statusColor = 'text-red-600 font-semibold';
          statusDecor = 'decoration-red-200 underline decoration-2 underline-offset-4 cursor-pointer';
        } else if (w.status === 'average') {
          statusColor = 'text-amber-600';
          statusDecor = 'decoration-amber-200 underline decoration-2 underline-offset-4 cursor-pointer';
        } else {
          statusColor = 'text-emerald-700 cursor-pointer';
        }
        return (
          <span key={idx} className="relative group inline-block">
            <span className={`text-xl md:text-2xl transition-colors ${statusColor} ${statusDecor}`}>{w.word}</span>
            {w.status !== 'good' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-primary-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                {w.phonetic && <div className="font-mono text-gray-300 mb-1">{w.phonetic}</div>}
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
  card: { id: string; title: string; type: 'score' | 'feedback' | 'strengths' | 'improvements' };
}) {
  const { type } = card;
  if (type === 'score') {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">Overall Score</span>
        <div className="text-5xl font-bold tracking-tighter text-primary-900 mb-2">{analysis.score}</div>
        <div className={`text-sm font-medium px-2 py-1 rounded-full ${analysis.score > 80 ? 'bg-green-100 text-green-700' : analysis.score > 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
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
          <div><span className="block text-gray-400 font-medium mb-1">Fluency</span><span className="text-primary-900">{analysis.fluency}</span></div>
          <div><span className="block text-gray-400 font-medium mb-1">Intonation</span><span className="text-primary-900">{analysis.intonation}</span></div>
        </div>
      </div>
    );
  }
  if (type === 'strengths') {
    const strengths = analysis.pronunciation?.strengths || [];
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Strengths</h4>
        <ul className="space-y-2">
          {strengths.length > 0 ? strengths.map((s, i) => (
            <li key={i} className="flex items-start text-sm text-primary-900">
              <Check size={16} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />{s}
            </li>
          )) : <li className="text-sm text-gray-400 italic">Analysis data not available.</li>}
        </ul>
      </div>
    );
  }
  if (type === 'improvements') {
    const weaknesses = analysis.pronunciation?.weaknesses || [];
    return (
      <div className="bg-white p-6 rounded-2xl shadow-float border border-black/5">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Improvements</h4>
        <ul className="space-y-2">
          {weaknesses.length > 0 ? weaknesses.map((w, i) => (
            <li key={i} className="flex items-start text-sm text-primary-900">
              <AlertCircle size={16} className="text-amber-500 mr-2 flex-shrink-0 mt-0.5" />{w}
            </li>
          )) : <li className="text-sm text-gray-400 italic">No major issues detected.</li>}
        </ul>
      </div>
    );
  }
  return null;
}
