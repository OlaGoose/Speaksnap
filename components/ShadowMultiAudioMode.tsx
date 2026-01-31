'use client';

import React, { useState, useRef } from 'react';
import {
  Loader2,
  Mic,
  Square,
  Trash2,
  Upload,
  Users,
  Check,
  AlertCircle,
  Volume2,
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

export function ShadowMultiAudioMode({
  challenge,
  refAudioBase64,
  onBack,
}: ShadowMultiAudioModeProps) {
  const [audioEntries, setAudioEntries] = useState<AudioEntry[]>([
    { id: '1', label: 'Person 1', audioUrl: null, audioBlob: null, analysis: null, analyzing: false, error: null },
    { id: '2', label: 'Person 2', audioUrl: null, audioBlob: null, analysis: null, analyzing: false, error: null },
    { id: '3', label: 'Person 3', audioUrl: null, audioBlob: null, analysis: null, analyzing: false, error: null },
  ]);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async (entryId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        setAudioEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? { ...entry, audioUrl: url, audioBlob: blob, error: null }
              : entry
          )
        );

        stream.getTracks().forEach((track) => track.stop());
        setRecordingId(null);
      };

      mediaRecorder.start();
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

  const deleteAudio = (entryId: string) => {
    setAudioEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              audioUrl: null,
              audioBlob: null,
              analysis: null,
              analyzing: false,
              error: null,
            }
          : entry
      )
    );
  };

  const analyzeAudio = async (entryId: string) => {
    const entry = audioEntries.find((e) => e.id === entryId);
    if (!entry || !entry.audioBlob) return;

    setAudioEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, analyzing: true, error: null } : e
      )
    );

    try {
      const userBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(entry.audioBlob!);
      });

      const response = await fetch('/api/shadow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAudioBase64: userBase64,
          userMimeType: entry.audioBlob!.type,
          referenceAudioBase64: refAudioBase64,
          referenceText: challenge.text,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAudioEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, analysis: result, analyzing: false, error: null }
            : e
        )
      );
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setAudioEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, analyzing: false, error: error.message || 'Analysis failed' }
            : e
        )
      );
    }
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

  return (
    <div className="h-full bg-primary-50 flex flex-col overflow-y-auto">
      <div className="flex-1 px-4 py-6 pb-32 safe-bottom">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-primary-900 mb-4"
            >
              ← Back to Single Mode
            </button>
            <div className="flex items-center justify-center gap-2">
              <Users size={20} className="text-primary-900" />
              <h2 className="text-xl font-semibold text-primary-900">
                Multi-Person Comparison
              </h2>
            </div>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Record or upload up to {MAX_AUDIOS} audio files to compare pronunciation.
              Perfect for family practice or classroom activities.
            </p>
            <h3 className="text-lg font-medium text-primary-900 mt-4">
              &quot;{challenge.text}&quot;
            </h3>
          </div>

          {/* Audio Entries */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full">
                      <Check size={14} className="text-emerald-700" />
                      <span className="text-xs text-emerald-700 font-medium">
                        {entry.analysis.score}
                      </span>
                    </div>
                  )}
                </div>

                {!entry.audioUrl ? (
                  <div className="space-y-3">
                    {recordingId === entry.id ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="flex items-end justify-center gap-1 h-8">
                          {[0, 0.12, 0.08, 0.16, 0.06].map((d, i) => (
                            <div
                              key={i}
                              className="w-1 h-5 rounded-full bg-red-500 recording-wave"
                              style={{ animationDelay: `${d}s` }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={stopRecording}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <Square size={16} />
                          Stop Recording
                        </button>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <audio controls src={entry.audioUrl} className="w-full h-10" />
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteAudio(entry.id)}
                        className="flex-1 text-red-500 py-2 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-50"
                      >
                        <Trash2 size={16} className="inline mr-1" />
                        Delete
                      </button>
                      {!entry.analysis && !entry.analyzing && (
                        <button
                          onClick={() => analyzeAudio(entry.id)}
                          className="flex-1 bg-primary-900 text-white py-2 rounded-lg text-sm font-medium"
                        >
                          Analyze
                        </button>
                      )}
                    </div>
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
          </div>

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
