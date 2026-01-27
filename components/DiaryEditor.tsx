'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles, BookOpen, TrendingUp, Target, Volume2, Languages, Wand2, Loader2, Copy, Bookmark } from 'lucide-react';
import { storage } from '@/lib/utils/storage';

interface DiaryEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalysisResult {
  dimensions: {
    contentExpression: { score: number; comment: string };
    grammarAccuracy: { score: number; comment: string };
    vocabularyNaturalness: { score: number; comment: string };
    englishThinking: { score: number; comment: string };
  };
  overallScore: number;
  overallLevel: string;
  summary: string;
  stats?: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    uniqueWords: number;
  };
  strengths?: string[];
  improvements?: string[];
  grammarFocus?: string[];
  sentenceAnalysis: Array<{
    original: string;
    isCorrect: boolean;
    issues: Array<{
      errorText: string;
      errorType: string;
      reason: string;
      correction: string;
      explanation: string;
    }>;
    naturalExpression: string;
    thinkingTips?: string;
  }>;
  optimized: string;
  upgradedVersion: string;
  patterns: Array<{
    pattern: string;
    explanation: string;
    example: string;
  }>;
  flashcards: Array<{
    term: string;
    phonetic: string;
    translation: string;
    definition: string;
    example: string;
    nativeUsage: string;
  }>;
}

export default function DiaryEditor({ isOpen, onClose }: DiaryEditorProps) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Selection State
  const [selectionMenu, setSelectionMenu] = useState<{
    x: number;
    y: number;
    text: string;
    context: string;
  } | null>(null);
  const [selectionActionLoading, setSelectionActionLoading] = useState(false);
  const [selectionResult, setSelectionResult] = useState<{
    type: 'translate' | 'optimize';
    text: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const diaryContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
        (typeof window !== 'undefined' && window.innerWidth < 768));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Text selection handler
  useEffect(() => {
    const handleSelectionChange = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelectionMenu(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length === 0) {
        setSelectionMenu(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Check if selection is within diary content area
      if (
        diaryContentRef.current &&
        diaryContentRef.current.contains(range.commonAncestorContainer)
      ) {
        // Get full sentence context
        let contextElement = range.commonAncestorContainer.parentElement;
        let context = '';
        
        // Walk up the DOM to find text container
        while (contextElement && !contextElement.classList.contains('diary-text-content')) {
          contextElement = contextElement.parentElement;
        }
        
        if (contextElement) {
          context = contextElement.textContent || '';
        } else {
          context = text;
        }

        const delay = isMobile ? 300 : 0;
        
        selectionTimeoutRef.current = setTimeout(() => {
          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.isCollapsed || 
              currentSelection.toString().trim() !== text) {
            return;
          }

          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const safeAreaTop = typeof window !== 'undefined' && 'visualViewport' in window 
            ? (window.visualViewport?.offsetTop || 0) 
            : 0;
          const safeAreaBottom = typeof window !== 'undefined' && 'visualViewport' in window
            ? (window.visualViewport?.height || viewportHeight)
            : viewportHeight;

          let menuX = rect.left + rect.width / 2;
          let menuY = rect.top;

          if (isMobile) {
            menuX = viewportWidth / 2;
            const menuHeight = 200;
            const spaceAbove = rect.top - safeAreaTop;
            const spaceBelow = safeAreaBottom - rect.bottom;
            
            if (spaceAbove > menuHeight + 20) {
              menuY = rect.top - menuHeight - 10;
            } else if (spaceBelow > menuHeight + 20) {
              menuY = rect.bottom + 10;
            } else {
              menuY = (rect.top + rect.bottom) / 2 - menuHeight / 2;
            }
          } else {
            menuX = Math.min(Math.max(70, menuX), viewportWidth - 150);
            menuY = Math.max(10, rect.top - 50);
          }

          setSelectionMenu({
            x: menuX,
            y: menuY,
            text: text,
            context: context,
          });
        }, delay);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      setTimeout(() => {
        handleSelectionChange();
      }, 100);
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (selectionMenu && 
          !target.closest('[class*="selection"]') && 
          !target.closest('.diary-text-content') &&
          !target.closest('button')) {
        window.getSelection()?.removeAllRanges();
        setSelectionMenu(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    if (isMobile) {
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchend', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (isMobile) {
        document.removeEventListener('touchend', handleTouchEnd);
      }
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [isMobile, selectionMenu]);

  const handleAnalyze = async () => {
    if (!text.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      
      console.log('📊 Diary analysis response:', data);
      
      // Validate required fields
      if (!data.overallScore || !data.sentenceAnalysis) {
        console.error('❌ Incomplete analysis data:', {
          hasOverallScore: !!data.overallScore,
          hasSentenceAnalysis: !!data.sentenceAnalysis,
          hasDimensions: !!data.dimensions,
          keys: Object.keys(data),
        });
        throw new Error('Incomplete analysis result. Please try again with a shorter entry.');
      }
      
      // Check optimized and upgradedVersion fields
      console.log('📊 Checking optimized field:', {
        hasOptimized: !!data.optimized,
        optimizedType: typeof data.optimized,
        optimizedLength: data.optimized?.length || 0,
        optimizedValue: data.optimized ? data.optimized.substring(0, 100) + '...' : 'empty',
      });
      console.log('📊 Checking upgradedVersion field:', {
        hasUpgradedVersion: !!data.upgradedVersion,
        upgradedVersionType: typeof data.upgradedVersion,
        upgradedVersionLength: data.upgradedVersion?.length || 0,
      });
      
      // Ensure optimized field exists, if not use sentenceAnalysis to generate it
      if (!data.optimized || data.optimized.trim() === '') {
        console.warn('⚠️ optimized field is missing or empty, generating from sentenceAnalysis');
        // Generate optimized version from sentenceAnalysis
        data.optimized = data.sentenceAnalysis
          .map((s: any) => s.naturalExpression || s.original)
          .join(' ');
      }
      
      console.log('✅ Analysis validation passed, setting result');
      setResult(data);

      // Save flashcards with YouTube videos
      if (data.flashcards && data.flashcards.length > 0) {
        // Fetch YouTube videos for each flashcard in parallel
        const flashcardsWithVideos = await Promise.all(
          data.flashcards.map(async (f: any, i: number) => {
            let videoIds: string[] = [];
            try {
              const searchQuery = `${f.term} English pronunciation usage example`;
              const videoResponse = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
              if (videoResponse.ok) {
                const videoData = await videoResponse.json();
                videoIds = (videoData.videos || []).slice(0, 3).map((v: any) => v.videoId);
              }
            } catch (error) {
              console.warn(`Failed to fetch videos for "${f.term}":`, error);
            }

            return {
              id: `${Date.now()}_${i}`,
              front: f.term,
              back: {
                phonetic: f.phonetic || '',
                translation: f.translation || '',
                definition: f.definition || '',
                example: f.example || '',
                native_usage: f.nativeUsage || '',
                video_ids: videoIds,
              },
              context: 'Diary Entry',
              timestamp: Date.now(),
              source: 'diary',
            };
          })
        );

        const cards = storage.getItem('speakSnapFlashcards') || [];
        storage.setItem('speakSnapFlashcards', [...flashcardsWithVideos, ...cards]);
      }

      // Save diary entry
      const entry = {
        id: Date.now().toString(),
        original: text,
        optimized: data.optimized,
        upgraded: data.upgradedVersion,
        timestamp: Date.now(),
      };

      const entries = storage.getItem('speakSnapDiary') || [];
      storage.setItem('speakSnapDiary', [entry, ...entries]);
    } catch (error: any) {
      console.error('Analysis error:', error);
      const errorMessage = error.message || 'Failed to analyze diary. Please try again.';
      
      // Show user-friendly error message
      if (errorMessage.includes('too long') || errorMessage.includes('truncated')) {
        alert('日记内容过长，请缩短到2000字符以内，或分成多段分析。\n\nDiary entry is too long. Please shorten to under 2000 characters or split into multiple entries.');
      } else if (errorMessage.includes('incomplete')) {
        alert('分析结果不完整，请尝试缩短日记内容后重试。\n\nAnalysis incomplete. Please try with a shorter entry.');
      } else {
        alert(`分析失败：${errorMessage}\n\nAnalysis failed: ${errorMessage}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTranslate = async () => {
    if (!selectionMenu) return;
    setSelectionActionLoading(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectionMenu.text }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const result = await response.json();
      setSelectionResult({ type: 'translate', text: result.translation });
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed');
    } finally {
      setSelectionActionLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!selectionMenu) return;
    setSelectionActionLoading(true);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectionMenu.text }),
      });

      if (!response.ok) throw new Error('Optimization failed');

      const result = await response.json();
      setSelectionResult({ type: 'optimize', text: result.optimized });
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Optimization failed');
    } finally {
      setSelectionActionLoading(false);
    }
  };

  const handleAddToFlashcard = async () => {
    if (!selectionMenu) return;

    const selectedText = selectionMenu.text;
    const context = selectionMenu.context;

    setSelectionMenu(null);

    const processingToast = document.createElement('div');
    processingToast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-50 animate-in fade-in';
    processingToast.textContent = '🔄 Generating flashcard...';
    document.body.appendChild(processingToast);

    try {
      const response = await fetch('/api/flashcard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          context: context,
          scenario: 'Diary Entry',
        }),
      });

      if (!response.ok) {
        throw new Error('Flashcard generation failed');
      }

      const cardContent = await response.json();

      const newCard = {
        id: Date.now().toString(),
        front: selectedText,
        back: {
          phonetic: cardContent.phonetic,
          translation: cardContent.translation,
          definition: cardContent.definition,
          example: cardContent.example,
          native_usage: cardContent.native_usage,
          video_ids: cardContent.video_ids || [],
        },
        context: context,
        timestamp: Date.now(),
        source: 'diary',
      };

      const cards = storage.getItem<any[]>('speakSnapFlashcards') || [];
      storage.setItem('speakSnapFlashcards', [newCard, ...cards]);

      processingToast.textContent = '✅ Flashcard saved!';
      processingToast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-sm z-50 animate-in fade-in';
      
      setTimeout(() => {
        document.body.removeChild(processingToast);
      }, 2000);
    } catch (error) {
      console.error('Flashcard error:', error);
      processingToast.textContent = '❌ Failed to create flashcard';
      processingToast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full text-sm z-50 animate-in fade-in';
      setTimeout(() => {
        document.body.removeChild(processingToast);
      }, 2000);
    }
  };

  const playAudio = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }, []);

  if (!isOpen) return null;

  if (result) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={() => {
                setResult(null);
                setText('');
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-white shadow-float flex items-center justify-center text-gray-700 active:scale-95 transition-transform touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-sm font-medium text-gray-900">Analysis Results</h2>
            <div className="w-10" />
          </div>
        </div>

        {/* Content */}
        <div ref={diaryContentRef} className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="flex flex-col gap-3">
            {/* Overall Summary & Stats */}
            <div className="grid md:grid-cols-2 gap-3">
              {/* Overall Assessment - Apple Style */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-gray-50/30 to-white backdrop-blur-xl border border-gray-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-white/40 pointer-events-none" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="text-5xl font-light text-gray-900 tracking-tight mb-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {result.overallScore}
                        <span className="text-2xl font-light text-gray-400 ml-1">/10</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className="text-5xl font-light text-gray-900 tracking-tight uppercase" style={{ fontVariantNumeric: 'tabular-nums' }}>{result.overallLevel}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200/50">
                    <p className="text-[15px] text-gray-700 leading-relaxed font-light tracking-wide">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {result.stats && (
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b px-5 py-3 text-sm font-medium">Statistics</div>
                  <div className="p-2 ">
                    <div className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-gray-900">Words</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 flex-shrink-0">{result.stats.wordCount}</div>
                    </div>
                    <div className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-gray-900">Sentences</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 flex-shrink-0">{result.stats.sentenceCount}</div>
                    </div>
                    <div className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-gray-900">Avg Length</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 flex-shrink-0">{result.stats.avgSentenceLength}</div>
                    </div>
                    <div className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-gray-900">Unique Words</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 flex-shrink-0">{result.stats.uniqueWords}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dimensions Scoring */}
            {result.dimensions && (
              <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                <div className="border-b px-5 py-3 text-sm font-medium">Dimensions</div>
                <div className="p-2 ">
                  {[
                    { key: 'contentExpression', label: '内容表达', color: 'blue' },
                    { key: 'grammarAccuracy', label: '语法准确度', color: 'red' },
                    { key: 'vocabularyNaturalness', label: '用词自然度', color: 'yellow' },
                    { key: 'englishThinking', label: '英语思维', color: 'purple' },
                  ].map(({ key, label, color }) => {
                    const dimension = result.dimensions[key as keyof typeof result.dimensions];
                    return (
                      <div key={key} className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                        <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm text-gray-900">{label}</span>
                        </div>
                        <div className="group relative flex items-center gap-x-2 w-[120px] font-medium text-gray-900 flex-shrink-0">
                          <div className="absolute inset-0 pr-2" style={{ width: '100%' }}>
                            <div className="h-full rounded-sm bg-gray-100 group-hover:bg-gray-200" style={{ width: `${dimension.score * 10}%` }}></div>
                          </div>
                          <div className="z-0 px-1 text-nowrap flex flex-row items-center gap-1">
                            <div className="w-[30px] text-right text-xs">{dimension.score}/10</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t px-5 py-3 bg-gray-50">
                  <div className="space-y-2">
                    {[
                      { key: 'contentExpression', label: '内容表达' },
                      { key: 'grammarAccuracy', label: '语法准确度' },
                      { key: 'vocabularyNaturalness', label: '用词自然度' },
                      { key: 'englishThinking', label: '英语思维' },
                    ].map(({ key, label }) => {
                      const dimension = result.dimensions[key as keyof typeof result.dimensions];
                      return (
                        <div key={key} className="text-xs text-gray-700">
                          <span className="font-medium">{label}:</span> {dimension.comment}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Improvements */}
            {((result.strengths && result.strengths.length > 0) || (result.improvements && result.improvements.length > 0) || (result.grammarFocus && result.grammarFocus.length > 0)) && (
              <div className="grid md:grid-cols-3 gap-3">
                {/* Strengths */}
                {result.strengths && result.strengths.length > 0 && (
                  <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                    <div className="border-b px-5 py-3 text-sm font-medium">Strengths</div>
                    <div className="p-2 ">
                      {result.strengths.map((strength, idx) => (
                        <div key={idx} className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                          <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm text-gray-900">{strength}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Areas to Improve */}
                {result.improvements && result.improvements.length > 0 && (
                  <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                    <div className="border-b px-5 py-3 text-sm font-medium">Focus Areas</div>
                    <div className="p-2 ">
                      {result.improvements.map((improvement, idx) => (
                        <div key={idx} className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                          <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm text-gray-900">{improvement}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grammar Focus */}
                {result.grammarFocus && result.grammarFocus.length > 0 && (
                  <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                    <div className="border-b px-5 py-3 text-sm font-medium">Grammar Focus</div>
                    <div className="p-2 ">
                      {result.grammarFocus.map((focus, idx) => (
                        <div key={idx} className="flex flex-row gap-1 items-center justify-between p-2 group rounded-sm">
                          <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm text-gray-900 font-mono">{focus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sentence Analysis */}
            {result.sentenceAnalysis && result.sentenceAnalysis.length > 0 && (
              <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                <div className="border-b px-5 py-3 text-sm font-medium">Sentence Analysis</div>
                <div className="p-2 ">
                  {result.sentenceAnalysis.map((sentence, idx) => (
                    <div key={idx} className="p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">{sentence.isCorrect ? '✅' : '❌'} Sentence {idx + 1}</span>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="diary-text-content">{sentence.original}</p>
                      </div>

                      {/* Issues Detail */}
                      {sentence.issues && sentence.issues.length > 0 && (
                        <div className="space-y-2">
                          {sentence.issues.map((issue, issueIdx) => (
                            <div key={issueIdx} className="bg-red-50 p-3 rounded border border-red-200 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium uppercase">
                                  {issue.errorType}
                                </span>
                                <span className="text-sm text-red-700 font-medium">{issue.errorText}</span>
                              </div>
                              <div className="text-xs text-gray-700 leading-relaxed">
                                <span className="font-medium">Reason:</span> {issue.reason}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-red-600 font-mono">{issue.errorText}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600 font-mono font-medium">{issue.correction}</span>
                              </div>
                              {issue.explanation && (
                                <div className="text-xs text-gray-600 leading-relaxed pt-1.5 border-t border-red-200">
                                  {issue.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Natural Expression */}
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1.5">Natural Expression:</p>
                        <p className="diary-text-content text-sm text-gray-900 leading-relaxed">{sentence.naturalExpression}</p>
                      </div>

                      {/* Thinking Tips */}
                      {sentence.thinkingTips && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-700 mb-1.5">Thinking Tips:</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{sentence.thinkingTips}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corrected & Upgraded Versions */}
            <div className="grid md:grid-cols-2 gap-3">
              {/* Corrected Version */}
              {result.optimized && result.optimized.trim() !== '' ? (
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b px-5 py-3 text-sm font-medium">Corrected Version</div>
                  <div className="p-5">
                    <p className="diary-text-content text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.optimized}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b px-5 py-3 text-sm font-medium">Corrected Version</div>
                  <div className="p-5">
                    <p className="text-sm text-gray-600 italic">Generating optimized version...</p>
                  </div>
                </div>
              )}

              {/* Upgraded Version */}
              {result.upgradedVersion && (
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b px-5 py-3 text-sm font-medium">Advanced Version</div>
                  <div className="p-5">
                    <p className="diary-text-content text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.upgradedVersion}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sentence Patterns */}
            {result.patterns && result.patterns.length > 0 && (
              <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                <div className="border-b px-5 py-3 text-sm font-medium">Useful Patterns</div>
                <div className="p-2 ">
                  {result.patterns.map((pattern, idx) => (
                    <div key={idx} className="p-3 space-y-2">
                      <p className="text-sm font-medium text-gray-900 font-mono">{pattern.pattern}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{pattern.explanation}</p>
                      <p className="text-xs text-gray-500 italic leading-relaxed bg-gray-50 px-2 py-1 rounded border border-gray-200">"{pattern.example}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flashcards */}
            {result.flashcards && result.flashcards.length > 0 && (
              <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                <div className="border-b px-5 py-3 text-sm font-medium">New Flashcards ({result.flashcards.length})</div>
                <div className="p-2 ">
                  {result.flashcards.map((card, idx) => (
                    <div key={idx} className="p-4 space-y-3">
                      <div className="flex items-center gap-3 justify-between">
                        <div className="flex items-baseline gap-2 flex-1">
                          <h4 className="text-base font-medium text-gray-900">{card.term}</h4>
                          {card.phonetic && (
                            <span className="text-xs text-gray-500 font-mono">/{card.phonetic}/</span>
                          )}
                        </div>
                        <button
                          onClick={() => playAudio(card.term)}
                          className="p-2 hover:bg-gray-100 rounded transition-all flex-shrink-0"
                        >
                          <Volume2 size={16} className="text-gray-600" />
                        </button>
                      </div>
                      {card.translation && (
                        <div className="text-sm text-gray-700 font-medium">{card.translation}</div>
                      )}
                      {card.definition && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Definition</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{card.definition}</p>
                        </div>
                      )}
                      {card.example && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Example</p>
                          <p className="text-xs text-gray-600 italic leading-relaxed bg-gray-50 px-3 py-2 rounded border border-gray-200">"{card.example}"</p>
                        </div>
                      )}
                      {card.nativeUsage && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-xs text-blue-700 leading-relaxed">{card.nativeUsage}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={() => {
              setResult(null);
              setText('');
              onClose();
            }}
            className="w-full py-3 bg-gray-900 text-white font-medium text-sm rounded-md hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-orange-50/30 via-white to-blue-50/30 flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-black/5 bg-white/70 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white shadow-float flex items-center justify-center text-gray-700 active:scale-95 transition-transform touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <div className="w-10" />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened today? Write freely in English..."
          className="w-full h-full text-[17px] text-gray-800 leading-relaxed resize-none outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>

      {/* Footer */}
      <div className="p-5 bg-gradient-to-t from-white via-white to-transparent sticky bottom-0">
        {text.trim() && (
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-3 text-gray-500 font-medium">
              <span className="bg-gray-100 px-2 py-1 rounded-full">{text.split(/\s+/).filter(w => w).length} words</span>
              <span className="bg-gray-100 px-2 py-1 rounded-full">{text.split(/[.!?]+/).filter(s => s.trim()).length} sentences</span>
            </div>
            {text.length > 2000 && (
              <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full">
                ⚠️ Too long
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="w-full h-14 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl font-semibold text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 hover:shadow-xl active:scale-[0.98] transition-all border border-white/10"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} className="text-yellow-300" />
              <span>Analyze & Improve</span>
            </>
          )}
        </button>
      </div>

      {/* Selection Menu */}
      {selectionMenu && !selectionResult && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionMenu.x}px`,
            top: `${Math.max(selectionMenu.y - 54, 60)}px`,
            transform: 'translate(-50%, 0)',
            zIndex: 50,
            pointerEvents: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="inline-flex items-center gap-1 bg-white/98 backdrop-blur-xl rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] pointer-events-auto border border-gray-200/80 py-1 px-2">
            {selectionActionLoading ? (
              <div className="px-3 py-2 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-gray-500" />
              </div>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const utterance = new SpeechSynthesisUtterance(selectionMenu.text);
                    utterance.lang = 'en-US';
                    utterance.rate = 0.85;
                    window.speechSynthesis.speak(utterance);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="group p-1 hover:bg-gray-100 active:bg-gray-200 transition-all rounded-full touch-manipulation"
                  title="Play audio"
                  aria-label="Play audio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 group-hover:text-gray-900 transition-colors">
                    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
                    <path d="M16 9a5 5 0 0 1 0 6"></path>
                  </svg>
                </button>
                
                <div className="h-4 w-px bg-gray-200"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranslate();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="group p-1 hover:bg-blue-50 active:bg-blue-100 transition-all rounded-full touch-manipulation"
                  title="Translate"
                  aria-label="Translate"
                >
                  <Languages size={18} className="text-blue-600 group-hover:text-blue-700 transition-colors" />
                </button>
                
                <div className="h-4 w-px bg-gray-200"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptimize();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="group p-1 hover:bg-purple-50 active:bg-purple-100 transition-all rounded-full touch-manipulation"
                  title="AI Optimize"
                  aria-label="AI Optimize"
                >
                  <Wand2 size={18} className="text-purple-600 group-hover:text-purple-700 transition-colors" />
                </button>
                
                <div className="h-4 w-px bg-gray-200"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToFlashcard();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="group p-1 hover:bg-green-50 active:bg-green-100 transition-all rounded-full touch-manipulation"
                  title="Save to Flashcard"
                  aria-label="Save to Flashcard"
                >
                  <Bookmark size={18} className="text-green-600 group-hover:text-green-700 transition-colors" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Selection Result Popup */}
      {selectionResult && (
        <div 
          className={`fixed ${isMobile ? 'bottom-20 left-4 right-4' : 'bottom-24 left-4 right-4'} z-50 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom max-h-[60vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              {selectionResult.type === 'translate' ? (
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Languages size={16} />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Wand2 size={16} />
                </div>
              )}
              <h3 className="font-semibold text-gray-900 text-sm">
                {selectionResult.type === 'translate' ? 'Translation' : 'Optimized'}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectionResult(null);
                setSelectionMenu(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Original:</p>
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">{selectionMenu?.text}</p>
            <p className="text-xs text-gray-500 font-medium mt-3">
              {selectionResult.type === 'translate' ? 'Translation:' : 'Optimized:'}
            </p>
            <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg leading-relaxed">{selectionResult.text}</p>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectionResult.text);
                const btn = document.activeElement as HTMLElement;
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                  btn.textContent = originalText;
                }, 1000);
              }}
              className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={14} />
              Copy
            </button>
            <button
              onClick={() => {
                setSelectionResult(null);
                setSelectionMenu(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="flex-1 px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
