'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ShadowWordAnalysis } from '@/lib/types';
import { Loader2, Volume2 } from 'lucide-react';

interface ShadowYouglishCardProps {
  words: ShadowWordAnalysis[];
  title?: string;
}

/**
 * Error Boundary for Youglish Card
 * Prevents Youglish errors from breaking the entire Shadow flow
 */
class YouglishCardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ShadowYouglishCard] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fail silently - don't render anything if there's an error
      return null;
    }

    return this.props.children;
  }
}

/**
 * Youglish pronunciation examples card for Shadow Reading
 * Shows native speaker examples for words the user struggled with
 */
function ShadowYouglishCardInner({ words, title = 'Native Examples' }: ShadowYouglishCardProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [youglishReady, setYouglishReady] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const widgetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter words that need practice (poor or average status)
  const problemWords = React.useMemo(() => {
    if (!words || !Array.isArray(words)) return [];
    return words
      .filter((w) => w && (w.status === 'poor' || w.status === 'average'))
      .map((w) => w.word)
      .filter((word) => word && typeof word === 'string' && word.trim().length > 0);
  }, [words]);

  // Load Youglish script
  useEffect(() => {
    if (typeof window === 'undefined' || problemWords.length === 0) return;

    const existingScript = document.querySelector('script[src*="youglish.com"]');
    if (existingScript) {
      if ((window as any).YG) {
        setYouglishReady(true);
      } else {
        (window as any).onYouglishAPIReady = () => setYouglishReady(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://youglish.com/public/emb/widget.js';
    script.async = true;
    (window as any).onYouglishAPIReady = () => setYouglishReady(true);
    document.body.appendChild(script);

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy?.();
        } catch (e) {
          console.warn('Youglish widget cleanup failed:', e);
        }
        widgetRef.current = null;
      }
    };
  }, [problemWords.length]);

  // Initialize widget when Youglish is ready
  useEffect(() => {
    if (!youglishReady || problemWords.length === 0 || !containerRef.current) return;

    const currentWord = problemWords[currentWordIndex];
    if (!currentWord) return;

    setWidgetLoading(true);

    // Clear previous widget
    if (widgetRef.current) {
      try {
        widgetRef.current.destroy?.();
      } catch (e) {
        console.warn('Failed to destroy previous widget:', e);
      }
      widgetRef.current = null;
    }

    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    try {
      // Validate that Youglish API is available
      if (!(window as any).YG || !(window as any).YG.Widget) {
        console.error('Youglish API not available');
        setWidgetLoading(false);
        setYouglishReady(false);
        return;
      }

      const widget = new (window as any).YG.Widget('youglish-shadow-widget', {
        width: containerRef.current?.offsetWidth || 300,
        components: 9,
        events: {
          onFetchDone: () => {
            setWidgetLoading(false);
          },
          onVideoChange: () => {
            // Video changed
          },
          onError: (error: any) => {
            console.error('Youglish widget error:', error);
            setWidgetLoading(false);
          },
        },
      });

      widget.fetch(currentWord, 'english');
      widgetRef.current = widget;
    } catch (error) {
      console.error('Failed to create Youglish widget:', error);
      setWidgetLoading(false);
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy?.();
        } catch (e) {
          console.warn('Widget cleanup error:', e);
        }
        widgetRef.current = null;
      }
    };
  }, [youglishReady, currentWordIndex, problemWords]);

  if (problemWords.length === 0) {
    return null;
  }

  const currentWord = problemWords[currentWordIndex];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full">
          <Volume2 size={14} className="text-amber-700" />
          <span className="text-xs text-amber-700 font-medium">Listen & Learn</span>
        </div>
      </div>

      {!youglishReady ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary-900" size={24} />
          <span className="ml-2 text-sm text-gray-600">Loading Youglish...</span>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Practicing word:</p>
                <p className="text-2xl font-bold text-primary-900">{currentWord}</p>
              </div>
              <div className="text-xs text-gray-500">
                {currentWordIndex + 1} / {problemWords.length}
              </div>
            </div>

            {problemWords.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {problemWords.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentWordIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      idx === currentWordIndex
                        ? 'bg-primary-900 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            {widgetLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                <Loader2 className="animate-spin text-primary-900" size={24} />
              </div>
            )}
            <div
              ref={containerRef}
              id="youglish-shadow-widget"
              className="w-full min-h-[300px] rounded-lg overflow-hidden bg-gray-50"
            />
          </div>

          <p className="text-xs text-gray-500 text-center">
            Watch native speakers pronounce &quot;{currentWord}&quot; in real contexts
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Exported component with error boundary
 */
export function ShadowYouglishCard(props: ShadowYouglishCardProps) {
  return (
    <YouglishCardErrorBoundary>
      <ShadowYouglishCardInner {...props} />
    </YouglishCardErrorBoundary>
  );
}
