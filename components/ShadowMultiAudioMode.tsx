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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async (entryId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Align with single mode: detect best mimeType, set audioBitsPerSecond
      const options: MediaRecorderOptions = { audioBitsPerSecond: 128000 };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        
        // Use actual mimeType from recorder or fallback to options
        const mimeType = mediaRecorder.mimeType || options.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        setAudioEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? { ...entry, audioUrl: url, audioBlob: blob, error: null }
              : entry
          )
        );

        setRecordingId(null);
      };

      // Use 250ms timeslice for more reliable data (same as single mode)
      mediaRecorder.start(250);
      setRecordingId(entryId);
    } catch (error) {
      console.error('Failed to start recording:', error);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
  const canAnalyzeAll = entriesWithAudio.length >= 2 && !analyzingAll && entriesWithAudio.every((e) => !e.analyzing);
  const anyAnalyzing = analyzingAll || audioEntries.some((e) => e.analyzing);

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
                      {entry.analyzing && (
                        <div className="flex items-center justify-center gap-2 py-2">
                          <Loader2 className="animate-spin" size={16} />
                          <span className="text-sm text-gray-600">Analyzing...</span>
                        </div>
                      )}
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

              {/* Add 3rd person - full-width row at bottom */}
              {audioEntries.length < MAX_AUDIOS && (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={addEntry}
                    className="w-full min-h-[120px] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 hover:bg-gray-100/80 hover:border-primary-300 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary-700 touch-manipulation"
                    aria-label="Add person"
                  >
                    <Plus size={28} />
                    <span className="text-sm font-medium">Add Person</span>
                  </button>
                </div>
              )}
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

      {/* Floating FAB - Stop when recording, Analyze when 2+ have audio */}
      {recordingId && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 safe-bottom">
          <button
            type="button"
            onClick={stopRecording}
            className="bg-primary-900 text-white px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 touch-manipulation min-h-[44px]"
            aria-label="Stop recording"
          >
            <Square size={18} />
            <span>Stop</span>
          </button>
        </div>
      )}
      {!recordingId && canAnalyzeAll && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 safe-bottom">
          <button
            type="button"
            onClick={analyzeAll}
            className="bg-primary-900 text-white px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 touch-manipulation min-h-[44px]"
            aria-label="Analyze all"
          >
            {anyAnalyzing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Activity size={18} />
            )}
            <span>{anyAnalyzing ? 'Analyzing...' : 'Analyze All'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ComparisonView({ entries }: { entries: AudioEntry[] }) {
  const bestScore = Math.max(...entries.map((e) => e.analysis?.score || 0));
  
  return (
    <div className="space-y-6">
      {/* Score Comparison */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Overall Scores
        </h4>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-gray-700 truncate">
                {entry.label}
              </span>
              <div className="flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full flex items-center px-3 transition-all ${
                    entry.analysis?.score === bestScore
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-r from-primary-700 to-primary-800'
                  }`}
                  style={{ width: `${entry.analysis?.score || 0}%` }}
                >
                  <span className="text-sm font-bold text-white">
                    {entry.analysis?.score}
                  </span>
                </div>
              </div>
              {entry.analysis?.score === bestScore && (
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full">
                  <Check size={14} className="text-emerald-700" />
                  <span className="text-xs text-emerald-700 font-medium">Best</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`p-4 rounded-xl space-y-3 ${
              entry.analysis?.score === bestScore
                ? 'bg-emerald-50 border-2 border-emerald-300'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-primary-900">{entry.label}</h5>
              <span className="text-2xl font-bold text-primary-900">
                {entry.analysis?.score}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Fluency:</span>
                <p className="text-gray-900">{entry.analysis?.fluency}</p>
              </div>
              <div>
                <span className="text-gray-600">Intonation:</span>
                <p className="text-gray-900">{entry.analysis?.intonation}</p>
              </div>
              {(entry.analysis?.pronunciation?.strengths?.length ?? 0) > 0 && (
                <div>
                  <span className="text-emerald-700 font-medium">Strengths:</span>
                  <ul className="text-gray-700 text-xs space-y-1 mt-1">
                    {(entry.analysis?.pronunciation?.strengths ?? []).slice(0, 2).map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
