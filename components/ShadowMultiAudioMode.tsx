'use client';

import React, { useState, useRef } from 'react';
import {
  Loader2,
  Mic,
  Square,
  Trash2,
  Upload,
  Check,
  AlertCircle,
  ChevronLeft,
  Plus,
  Activity,
} from 'lucide-react';
import type { ShadowDailyChallenge, ShadowAnalysisResult } from '@/lib/types';

interface AudioEntry {
  id: string;
  label: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  analysis: ShadowAnalysisResult | null;
  analyzing: boolean;
  error: string | null;
}

interface ShadowMultiAudioModeProps {
  challenge: ShadowDailyChallenge;
  refAudioBase64: string;
  onBack: () => void;
}

const MAX_AUDIOS = 3;
const INITIAL_SLOTS = 2;

function createEntry(id: string, label: string): AudioEntry {
  return { id, label, audioUrl: null, audioBlob: null, analysis: null, analyzing: false, error: null };
}

export function ShadowMultiAudioMode({
  challenge,
  refAudioBase64,
  onBack,
}: ShadowMultiAudioModeProps) {
  const [audioEntries, setAudioEntries] = useState<AudioEntry[]>(() =>
    [1, 2].map((i) => createEntry(`entry-${i}`, `Person ${i}`))
  );
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const nextIdRef = useRef(3);
  const activeRecorderRef = useRef<{
    mediaRecorder: MediaRecorder;
    chunks: Blob[];
    entryId: string;
  } | null>(null);

  const startRecording = async (entryId: string) => {
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
      
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      
      activeRecorderRef.current = {
        mediaRecorder,
        chunks,
        entryId,
      };

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && activeRecorderRef.current?.entryId === entryId) {
          activeRecorderRef.current.chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (!activeRecorderRef.current || activeRecorderRef.current.entryId !== entryId) {
          return;
        }
        
        const mimeType = mediaRecorder.mimeType || options.mimeType || 'audio/webm';
        const blob = new Blob(activeRecorderRef.current.chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        setAudioEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? { ...entry, audioUrl: url, audioBlob: blob, error: null }
              : entry
          )
        );

        activeRecorderRef.current = null;
        setRecordingId(null);
      };

      mediaRecorder.start(250);
      setRecordingId(entryId);
    } catch (error) {
      console.error('Failed to start recording:', error);
      activeRecorderRef.current = null;
      setAudioEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, error: 'Failed to access microphone' }
            : entry
        )
      );
    }
  };

  const stopRecording = () => {
    if (activeRecorderRef.current?.mediaRecorder && 
        activeRecorderRef.current.mediaRecorder.state !== 'inactive') {
      activeRecorderRef.current.mediaRecorder.stop();
    }
  };

  const addEntry = () => {
    if (audioEntries.length >= MAX_AUDIOS) return;
    const id = `entry-${nextIdRef.current++}`;
    setAudioEntries((prev) => [...prev, createEntry(id, `Person ${prev.length + 1}`)]);
  };

  const deleteAudio = (entryId: string) => {
    setAudioEntries((prev) => {
      const next = prev
        .filter((e) => e.id !== entryId)
        .map((e, i) => ({ ...e, label: `Person ${i + 1}` }));
      return next;
    });
  };

  const analyzeAll = async () => {
    const withAudio = audioEntries.filter((e) => e.audioBlob && !e.analysis && !e.analyzing);
    if (withAudio.length === 0) return;
    setAnalyzingAll(true);
    for (const entry of withAudio) {
      setAudioEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, analyzing: true, error: null } : e)));
      try {
        const userBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(entry.audioBlob!);
        });
        const res = await fetch('/api/shadow/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAudioBase64: userBase64,
            userMimeType: entry.audioBlob!.type,
            refAudioBase64,
            refText: challenge.text,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed');
        setAudioEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, analysis: data, analyzing: false, error: null } : e))
        );
      } catch (err: any) {
        setAudioEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, analyzing: false, error: err.message || 'Analysis failed' } : e
          )
        );
      }
    }
    setAnalyzingAll(false);
  };

  const handleFileUpload = async (entryId: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      setAudioEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, error: 'Please select an audio file' } : e
        )
      );
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, audioUrl: url, audioBlob: file, error: null }
          : e
      )
    );
  };

  const analyzedEntries = audioEntries.filter((e) => e.analysis !== null);
  const showComparison = analyzedEntries.length >= 2;

  const entriesWithAudio = audioEntries.filter((e) => e.audioUrl);
  const hasMinimumAudios = entriesWithAudio.length >= 2;
  const anyAnalyzing = analyzingAll || audioEntries.some((e) => e.analyzing);
  const canAnalyze = hasMinimumAudios && !anyAnalyzing && entriesWithAudio.some((e) => !e.analysis);

  return (
    <div className="h-full bg-primary-50 flex flex-col overflow-y-auto">
      <div className="flex-1 px-4 py-6 pb-32 safe-bottom">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header - same layout as Past Analyses: Back (left), title (center), spacer (right) */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-900 font-medium touch-manipulation min-h-[44px]"
              aria-label="Back to challenge"
            >
              <ChevronLeft size={18} />
              Back
            </button>
            <h2 className="text-lg font-semibold text-primary-900">Multi-Person Comparison</h2>
            <div className="w-14" aria-hidden="true" />
          </div>

          <p className="text-sm text-gray-600 text-center max-w-md mx-auto">
            Record or upload 2–{MAX_AUDIOS} audio files, then tap Analyze to compare with the reference.
          </p>
          <h3 className="text-lg font-medium text-primary-900 text-center px-2">
            &quot;{challenge.text}&quot;
          </h3>

          {/* Recording state - same full-width card as single mode */}
          {recordingId && (
            <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-end justify-center gap-1 h-8" aria-hidden="true">
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
              </div>
            </div>
          )}

          {/* Audio Entries */}
          {!recordingId && (
            <div className="grid gap-4 md:grid-cols-2">
              {audioEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-2xl p-5 shadow-float border border-black/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(e) =>
                        setAudioEntries((prev) =>
                          prev.map((item) =>
                            item.id === entry.id ? { ...item, label: e.target.value } : item
                          )
                        )
                      }
                      className="text-lg font-semibold text-primary-900 bg-transparent border-none outline-none w-full"
                      placeholder="Enter name"
                    />
                    {entry.analysis && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full shrink-0">
                        <Check size={14} className="text-emerald-700" />
                        <span className="text-xs text-emerald-700 font-medium">
                          {entry.analysis.score}
                        </span>
                      </div>
                    )}
                  </div>

                  {!entry.audioUrl ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => startRecording(entry.id)}
                        className="w-full bg-primary-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <Mic size={18} />
                        Record
                      </button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(entry.id, file);
                          }}
                          className="hidden"
                          id={`upload-${entry.id}`}
                        />
                        <label
                          htmlFor={`upload-${entry.id}`}
                          className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-200"
                        >
                          <Upload size={18} />
                          Upload Audio
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <audio controls src={entry.audioUrl} className="w-full h-10" />
                      <button
                        onClick={() => deleteAudio(entry.id)}
                        className="w-full text-red-500 py-2 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-50 flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                      {entry.error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle size={16} />
                          {entry.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}

          {/* Add Person Button - compact, centered */}
          {!recordingId && audioEntries.length < MAX_AUDIOS && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 hover:border-primary-400 transition-colors text-gray-700 hover:text-primary-900 font-medium text-sm touch-manipulation shadow-sm"
                aria-label="Add person"
              >
                <Plus size={18} />
                <span>Add Person {audioEntries.length + 1}</span>
              </button>
            </div>
          )}

          {/* FAB area placeholder so content isn't hidden */}
          <div className="h-4" aria-hidden />

          {/* Comparison View */}
          {showComparison && (
            <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-6">
              <h3 className="text-lg font-semibold text-primary-900 text-center">
                Comparison Results
              </h3>
              <ComparisonView entries={analyzedEntries} />
            </div>
          )}
        </div>
      </div>

      {/* Floating FAB - Stop when recording, Analyze always visible but disabled when needed */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 safe-bottom">
        {recordingId ? (
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
            onClick={analyzeAll}
            disabled={!canAnalyze}
            className={`px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 touch-manipulation min-h-[44px] transition-all ${
              canAnalyze
                ? 'bg-primary-900 text-white hover:scale-105 active:scale-95 cursor-pointer'
                : anyAnalyzing
                  ? 'bg-primary-900 text-white cursor-wait'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
            aria-label={
              anyAnalyzing
                ? 'Analyzing...'
                : !hasMinimumAudios
                  ? 'Need at least 2 recordings'
                  : 'Analyze all'
            }
          >
            {anyAnalyzing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Activity size={18} />
            )}
            <span>{anyAnalyzing ? 'Analyzing...' : 'Analyze All'}</span>
          </button>
        )}
        {!recordingId && !anyAnalyzing && !hasMinimumAudios && (
          <p className="text-xs text-gray-500 text-center mt-2 absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            Need at least 2 recordings
          </p>
        )}
      </div>
    </div>
  );
}

function ComparisonView({ entries }: { entries: AudioEntry[] }) {
  const bestScore = Math.max(...entries.map((e) => e.analysis?.score || 0));
  
  // Extract numeric scores from text evaluations (fallback to reasonable estimates)
  const getNumericScore = (text: string | undefined): number => {
    if (!text) return 50;
    const lower = text.toLowerCase();
    if (lower.includes('excellent') || lower.includes('great') || lower.includes('perfect')) return 90;
    if (lower.includes('good') || lower.includes('clear') || lower.includes('natural')) return 75;
    if (lower.includes('adequate') || lower.includes('fair') || lower.includes('okay')) return 60;
    if (lower.includes('needs') || lower.includes('improve') || lower.includes('weak')) return 40;
    return 50;
  };

  const colors = [
    { primary: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    { primary: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    { primary: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  ];

  const dimensions = [
    { key: 'overall', label: 'Overall', getValue: (e: AudioEntry) => e.analysis?.score || 0 },
    { key: 'fluency', label: 'Fluency', getValue: (e: AudioEntry) => getNumericScore(e.analysis?.fluency) },
    { key: 'intonation', label: 'Intonation', getValue: (e: AudioEntry) => getNumericScore(e.analysis?.intonation) },
    { key: 'pronunciation', label: 'Pronunciation', getValue: (e: AudioEntry) => {
      const strengths = e.analysis?.pronunciation?.strengths?.length || 0;
      const weaknesses = e.analysis?.pronunciation?.weaknesses?.length || 0;
      return Math.max(20, Math.min(100, 70 + (strengths * 10) - (weaknesses * 8)));
    }},
  ];

  return (
    <div className="space-y-8">
      {/* Champion Card - Highlight the winner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-lg">
          <span className="text-2xl">🏆</span>
          <span className="text-white font-bold text-lg">{entries.find(e => e.analysis?.score === bestScore)?.label}</span>
        </div>
        <p className="text-sm text-gray-600">Best Overall Performance</p>
      </div>

      {/* Multi-Dimensional Comparison */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider text-center">
          Performance Breakdown
        </h4>
        
        {dimensions.map((dim) => (
          <div key={dim.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{dim.label}</span>
              <div className="flex items-center gap-2">
                {entries.map((entry, idx) => {
                  const value = dim.getValue(entry);
                  const isMax = value === Math.max(...entries.map(e => dim.getValue(e)));
                  return (
                    <div key={entry.id} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${colors[idx % colors.length].primary}`} />
                      <span className={`text-xs font-bold ${isMax ? 'text-primary-900' : 'text-gray-500'}`}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
              {entries.map((entry, idx) => {
                const value = dim.getValue(entry);
                const maxValue = Math.max(...entries.map(e => dim.getValue(e)));
                const width = (value / 100) * 100;
                return (
                  <div
                    key={entry.id}
                    className={`absolute top-0 h-full ${colors[idx % colors.length].primary} transition-all ${
                      value === maxValue ? 'opacity-100' : 'opacity-70'
                    }`}
                    style={{ 
                      left: `${idx * 33.33}%`,
                      width: `${width / entries.length}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend with Names */}
      <div className="flex items-center justify-center gap-4 flex-wrap pt-2 border-t border-gray-200">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length].primary}`} />
            <span className="text-sm font-medium text-gray-700">{entry.label}</span>
            <span className="text-xs text-gray-500">({entry.analysis?.score})</span>
          </div>
        ))}
      </div>

      {/* Individual Cards with Details */}
      <div className="grid gap-4 md:grid-cols-3 pt-4">
        {entries.map((entry, idx) => {
          const color = colors[idx % colors.length];
          const isWinner = entry.analysis?.score === bestScore;
          return (
            <div
              key={entry.id}
              className={`relative p-5 rounded-2xl space-y-3 transition-all ${
                isWinner
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 shadow-lg scale-105'
                  : `${color.light} border ${color.border}`
              }`}
            >
              {isWinner && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-lg">👑</span>
                </div>
              )}
              
              <div className="text-center space-y-2">
                <h5 className="font-bold text-lg text-primary-900">{entry.label}</h5>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md">
                  <span className="text-2xl font-bold text-primary-900">{entry.analysis?.score}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className={`p-2 rounded-lg bg-white/70`}>
                  <span className="font-semibold text-gray-700">Fluency:</span>
                  <p className="text-gray-600 mt-0.5">{entry.analysis?.fluency}</p>
                </div>
                <div className={`p-2 rounded-lg bg-white/70`}>
                  <span className="font-semibold text-gray-700">Intonation:</span>
                  <p className="text-gray-600 mt-0.5">{entry.analysis?.intonation}</p>
                </div>
              </div>

              {(entry.analysis?.pronunciation?.strengths?.length ?? 0) > 0 && (
                <div className="pt-2 border-t border-gray-300/50">
                  <span className="text-xs font-bold text-emerald-700">✨ Top Strengths</span>
                  <ul className="text-xs text-gray-700 space-y-1 mt-1">
                    {(entry.analysis?.pronunciation?.strengths ?? []).slice(0, 2).map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-emerald-500 shrink-0">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
