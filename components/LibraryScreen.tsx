'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Screen, Scenario, DialogueRecord } from '@/lib/types';
import {
  Camera,
  MapPin,
  Search,
  ArrowLeft,
  PenTool,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Trophy,
  Clock,
  Play,
  Eye,
  Trash2,
} from 'lucide-react';
import FlashcardDeck from './FlashcardDeck';
import DiaryEditor from './DiaryEditor';
import { storage } from '@/lib/utils/storage';

interface LibraryScreenProps {
  onNavigate: (screen: Screen) => void;
  onSelectScenario: (scenario: Scenario, dialogueId?: string) => void;
}

interface DiaryEntry {
  id: string;
  original?: string;
  optimized?: string;
  upgraded?: string;
  timestamp: number;
}

export default function LibraryScreen({ onNavigate, onSelectScenario }: LibraryScreenProps) {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'flashcards' | 'diary'>('scenarios');
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [isWritingDiary, setIsWritingDiary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [expandedDiaryId, setExpandedDiaryId] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
    if (activeTab === 'diary') {
      loadDiaries();
    }
  }, [activeTab]);

  const loadScenarios = useCallback(() => {
    const scenarios = storage.getItem<Scenario[]>('speakSnapScenarios');
    if (scenarios) {
      // Sort by last practiced
      scenarios.sort((a: Scenario, b: Scenario) => b.last_practiced - a.last_practiced);
      setSavedScenarios(scenarios);
    }
  }, []);

  const loadDiaries = useCallback(() => {
    const entries = storage.getItem<DiaryEntry[]>('speakSnapDiary');
    if (entries && Array.isArray(entries)) {
      // Filter and validate entries to ensure they have required fields
      const validEntries = entries.filter((entry) => {
        return (
          entry &&
          typeof entry.id === 'string' &&
          typeof entry.timestamp === 'number' &&
          (typeof entry.original === 'string' || typeof entry.optimized === 'string')
        );
      });
      setDiaryEntries(validEntries);
    } else {
      setDiaryEntries([]);
    }
  }, []);

  const handleDeleteDiary = useCallback((diaryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this diary entry?')) return;
    
    const updated = diaryEntries.filter((d) => d.id !== diaryId);
    setDiaryEntries(updated);
    storage.setItem('speakSnapDiary', updated);
    if (expandedDiaryId === diaryId) {
      setExpandedDiaryId(null);
    }
  }, [diaryEntries, expandedDiaryId]);

  const handleDeleteScenario = useCallback((scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this scenario and all its dialogues?')) return;
    
    const updated = savedScenarios.filter((s) => s.id !== scenarioId);
    setSavedScenarios(updated);
    storage.setItem('speakSnapScenarios', updated);
    if (expandedScenarioId === scenarioId) {
      setExpandedScenarioId(null);
    }
  }, [savedScenarios, expandedScenarioId]);

  const handleDeleteDialogue = (scenario: Scenario, dialogueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this dialogue?')) return;
    
    const updatedScenarios = savedScenarios.map((s) => {
      if (s.id === scenario.id) {
        const updatedDialogues = s.dialogues.filter((d) => d.id !== dialogueId);
        const completedDialogues = updatedDialogues.filter((d) => d.is_completed);
        return {
          ...s,
          dialogues: updatedDialogues,
          total_attempts: completedDialogues.length,
          best_score: Math.max(...completedDialogues.map((d) => d.average_score || 0), 0),
        };
      }
      return s;
    });
    
    setSavedScenarios(updatedScenarios);
    localStorage.setItem('speakSnapScenarios', JSON.stringify(updatedScenarios));
  };

  const toggleExpand = (scenarioId: string) => {
    setExpandedScenarioId(expandedScenarioId === scenarioId ? null : scenarioId);
  };

  const filteredScenarios = savedScenarios.filter((s) =>
    s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.situation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isWritingDiary) {
    return (
      <DiaryEditor 
        isOpen={isWritingDiary} 
        onClose={() => {
          setIsWritingDiary(false);
          // Reload diaries when closing editor
          if (activeTab === 'diary') {
            loadDiaries();
          }
        }} 
      />
    );
  }

  return (
    <div className="h-full bg-primary-50 flex flex-col overflow-hidden">
      {/* Header with safe area */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-2 bg-primary-50/95 backdrop-blur-sm border-b border-black/5 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => onNavigate(Screen.CAMERA)}
            className="w-10 h-10 rounded-full bg-white shadow-float flex items-center justify-center text-gray-700 active:scale-95 transition-transform touch-manipulation"
            aria-label="Go back to camera"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white rounded-full border border-transparent shadow-float outline-none focus:border-gray-300 transition-all placeholder:text-gray-400 text-base"
              aria-label="Search scenarios"
            />
            <Search className="absolute left-3.5 top-2.5 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-2" role="tablist">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
              activeTab === 'scenarios' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
            role="tab"
            aria-selected={activeTab === 'scenarios'}
            aria-label="Scenarios tab"
          >
            Scenarios
          </button>
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
              activeTab === 'flashcards' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
            role="tab"
            aria-selected={activeTab === 'flashcards'}
            aria-label="Flashcards tab"
          >
            Flashcards
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
              activeTab === 'diary' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
            role="tab"
            aria-selected={activeTab === 'diary'}
            aria-label="Diary tab"
          >
            Diary
          </button>
        </div>
      </div>

      {/* Content with optimized scrolling */}
      <div className="flex-1 px-4 pt-4 pb-24 overflow-y-auto scroll-container safe-bottom">
        {activeTab === 'scenarios' && (
          <div className="space-y-3 py-4 animate-in fade-in duration-300">
            {filteredScenarios.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-float border border-gray-100/50 mt-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="text-gray-300" size={32} />
                </div>
                <h3 className="font-semibold text-gray-900">No scenarios yet</h3>
                <p className="text-gray-500 text-sm mt-1 mb-6">
                  Start by capturing a photo or describing a scene.
                </p>
                <button
                  onClick={() => onNavigate(Screen.CAMERA)}
                  className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-lg active:scale-95 transition-transform"
                >
                  Create First Scenario
                </button>
              </div>
            ) : (
              filteredScenarios.map((scenario) => {
                const isExpanded = expandedScenarioId === scenario.id;
                const inProgressDialogue = scenario.dialogues.find((d) => !d.is_completed);
                const completedDialogues = scenario.dialogues.filter((d) => d.is_completed);

                return (
                  <div
                    key={scenario.id}
                    className="bg-white rounded-2xl shadow-float border border-transparent hover:border-gray-200 transition-all overflow-hidden"
                  >
                    {/* Scenario Header */}
                    <div
                      onClick={() => toggleExpand(scenario.id)}
                      className="p-4 cursor-pointer active:bg-gray-50 transition-colors touch-manipulation"
                      role="button"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} scenario: ${scenario.location}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative">
                          {scenario.image_url ? (
                            <img
                              src={scenario.image_url}
                              alt={scenario.location}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <MapPin size={28} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-primary-900 text-base truncate">
                                {scenario.location}
                              </h3>
                              <p className="text-gray-500 text-sm truncate mt-0.5">
                                {scenario.situation}
                              </p>
                            </div>
                            <div className="shrink-0">
                              {isExpanded ? (
                                <ChevronDown size={20} className="text-gray-400" />
                              ) : (
                                <ChevronRight size={20} className="text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MessageCircle size={12} />
                              <span>{scenario.total_attempts} completed</span>
                            </div>
                            {scenario.best_score > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <Trophy size={12} className="text-amber-500" />
                                <span className="text-amber-600 font-semibold">
                                  {scenario.best_score}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>
                                {new Date(scenario.last_practiced).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* In-progress indicator */}
                          {inProgressDialogue && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full w-fit">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                              <span className="font-medium">In progress</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top duration-200">
                        {/* Action Buttons */}
                        <div className="p-4 space-y-2">
                          {inProgressDialogue ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectScenario(scenario, inProgressDialogue.id);
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
                            >
                              <Play size={16} />
                              Continue Dialogue ({inProgressDialogue.messages.length} messages)
                            </button>
                          ) : null}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectScenario(scenario);
                            }}
                            className="w-full bg-primary-900 hover:bg-primary-800 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
                          >
                            <MessageCircle size={16} />
                            Start New Dialogue
                          </button>
                        </div>

                        {/* Dialogue History */}
                        {completedDialogues.length > 0 && (
                          <div className="p-4 pt-0">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                              Completed Dialogues ({completedDialogues.length})
                            </h4>
                            <div className="space-y-2">
                              {completedDialogues.slice(0, 3).map((dialogue) => (
                                <div
                                  key={dialogue.id}
                                  className="bg-white rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition-all group"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="text-xs text-gray-400">
                                          {new Date(dialogue.timestamp).toLocaleString()}
                                        </div>
                                        {dialogue.average_score && (
                                          <div
                                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                              dialogue.average_score >= 80
                                                ? 'bg-green-50 text-green-700'
                                                : dialogue.average_score >= 60
                                                ? 'bg-yellow-50 text-yellow-700'
                                                : 'bg-orange-50 text-orange-700'
                                            }`}
                                          >
                                            {dialogue.average_score}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {dialogue.messages.length} messages • {dialogue.user_level}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectScenario(scenario, dialogue.id);
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="View dialogue"
                                      >
                                        <Eye size={14} className="text-gray-400" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteDialogue(scenario, dialogue.id, e)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete dialogue"
                                      >
                                        <Trash2 size={14} className="text-red-400" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Delete Scenario */}
                        <div className="p-4 pt-2 border-t border-gray-100">
                          <button
                            onClick={(e) => handleDeleteScenario(scenario.id, e)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 touch-manipulation min-h-[44px] px-3"
                            aria-label="Delete scenario"
                          >
                            <Trash2 size={12} />
                            Delete Scenario
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'flashcards' && <FlashcardDeck key={`flashcards-${activeTab}`} />}

        {activeTab === 'diary' && (
          <div className="py-4 space-y-4 pb-32 safe-bottom">
            {diaryEntries.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-float">
                <PenTool className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="font-semibold text-gray-900">Your English Diary</h3>
                <p className="text-gray-500 text-sm mt-1 mb-6">
                  Write daily reflections and improve your English writing skills.
                </p>
                <button
                  onClick={() => setIsWritingDiary(true)}
                  className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-lg active:scale-95 transition-transform touch-manipulation min-h-[44px]"
                  aria-label="Start writing diary"
                >
                  Start Writing
                </button>
              </div>
            ) : (
              diaryEntries.map((entry) => {
                const isExpanded = expandedDiaryId === entry.id;
                const originalText = (entry.original ?? entry.optimized ?? 'No content available');
                const previewText = originalText.length > 120 
                  ? originalText.slice(0, 120) + '...' 
                  : originalText;

                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl shadow-float border border-transparent hover:border-gray-200 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedDiaryId(isExpanded ? null : entry.id)}
                      className="p-4 cursor-pointer active:bg-gray-50 transition-colors touch-manipulation"
                      role="button"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} diary entry`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <PenTool size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(entry.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {isExpanded ? originalText : previewText}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown size={20} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={20} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top duration-200">
                        <div className="p-4 space-y-4">
                          {/* Original Version */}
                          {entry.original && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Original Version
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-200 whitespace-pre-wrap">
                                {entry.original}
                              </p>
                            </div>
                          )}

                          {/* Optimized Version */}
                          {entry.optimized && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Corrected Version
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-200 whitespace-pre-wrap">
                                {entry.optimized}
                              </p>
                            </div>
                          )}

                          {/* Upgraded Version */}
                          {entry.upgraded && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Advanced Version
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-200 whitespace-pre-wrap">
                                {entry.upgraded}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-3 pt-2">
                            {entry.optimized && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const textToCopy = entry.optimized ?? '';
                                  if (textToCopy) {
                                    navigator.clipboard.writeText(textToCopy);
                                    alert('Corrected version copied!');
                                  }
                                }}
                                className="text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1.5 bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors touch-manipulation min-h-[44px]"
                                aria-label="Copy corrected version"
                              >
                                <Eye size={12} />
                                Copy Corrected
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteDiary(entry.id, e)}
                              className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5 ml-auto touch-manipulation min-h-[44px] px-3"
                              aria-label="Delete diary entry"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* FAB with safe area */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 safe-bottom">
        {activeTab === 'diary' ? (
          <button
            onClick={() => setIsWritingDiary(true)}
            className="bg-primary-900 text-white px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 touch-manipulation min-h-[44px]"
            aria-label="Write diary"
          >
            <PenTool size={18} />
            <span>Write Diary</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate(Screen.CAMERA)}
            className="bg-primary-900 text-white px-5 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 touch-manipulation min-h-[44px]"
            aria-label="Create new scenario"
          >
            <Camera size={18} />
            <span>New Scenario</span>
          </button>
        )}
      </div>
    </div>
  );
}
