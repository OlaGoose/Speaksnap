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
  const [widgetError, setWidgetError] = useState(false);
  const widgetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Identify words user pronounced poorly: status poor/average, or has issue (same as flashcard logic – one term per Youglish search)
  const problemWords = React.useMemo(() => {
    if (!words || !Array.isArray(words)) return [];

    const filtered = words
      .filter(
        (w) =>
          w &&
          (w.status === 'poor' ||
            w.status === 'average' ||
            (typeof w.issue === 'string' && w.issue.trim().length > 0))
      )
      .map((w) => w.word)
      .filter((word) => word && typeof word === 'string' && word.trim().length > 0)
      .map((word) =>
        word
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
      )
      .filter((word) => word.length > 0);

    return Array.from(new Set(filtered));
  }, [words]);

  // Load Youglish script when we have words (so widget is ready when problemWords exist)
  useEffect(() => {
    if (typeof window === 'undefined' || (words?.length ?? 0) === 0) return;

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
  }, [words?.length]);

  // Initialize widget when Youglish is ready
  useEffect(() => {
    if (!youglishReady || problemWords.length === 0 || !containerRef.current) return;

    const currentWord = problemWords[currentWordIndex];
    if (!currentWord || typeof currentWord !== 'string') return;

    // Reset error state when changing word
    setWidgetError(false);

    let retryTimeoutId: NodeJS.Timeout | null = null;

    const initializeWidget = (container: HTMLDivElement, containerWidth: number) => {
      try {
        setWidgetLoading(true);

        // Validate that Youglish API is available
        if (!(window as any).YG || !(window as any).YG.Widget) {
          console.warn('[Youglish] API not available');
          setWidgetLoading(false);
          setWidgetError(true);
          return;
        }

        // Clear previous widget
        if (widgetRef.current) {
          try {
            widgetRef.current.destroy?.();
          } catch (e) {
            console.warn('[Youglish] Failed to destroy previous widget:', e);
          }
          widgetRef.current = null;
        }

        // Clear container
        container.innerHTML = '';

        // Match flashcard: components 72, autoStart 1, width from container
        const widgetWidth = Math.max(320, Math.min(containerWidth, 1200));

        const widget = new (window as any).YG.Widget('youglish-shadow-widget', {
          width: widgetWidth,
          components: 72, // Search + title + controls (same as FlashcardDeck)
          autoStart: 1,
          events: {
            onFetchDone: () => {
              setWidgetLoading(false);
            },
            onVideoChange: () => {},
            onError: () => {
              setWidgetLoading(false);
              setWidgetError(true);
            },
          },
        });

        // Fetch the word (already cleaned in problemWords memo)
        console.log('[Youglish] Fetching word:', currentWord, 'width:', widgetWidth);
        widget.fetch(currentWord, 'english');
        widgetRef.current = widget;
      } catch (error) {
        console.error('[Youglish] Failed to create widget:', error);
        setWidgetLoading(false);
        setWidgetError(true);
      }
    };

    // Add delay to avoid bot detection and ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // Check container dimensions (critical fix: match FlashcardDeck behavior)
      const containerRect = container.getBoundingClientRect();
      if (containerRect.width === 0 || containerRect.height === 0) {
        console.warn('[Youglish] Container has no dimensions, retrying...', containerRect);
        // Retry after container becomes visible
        retryTimeoutId = setTimeout(() => {
          const retryContainer = containerRef.current;
          if (!retryContainer) return;

          const retryRect = retryContainer.getBoundingClientRect();
          if (retryRect.width === 0 || retryRect.height === 0) {
            console.warn('[Youglish] Container still has no dimensions after retry, skipping initialization');
            return;
          }

          // Retry initialization
          initializeWidget(retryContainer, retryRect.width || retryContainer.offsetWidth || 640);
        }, 300);
        return;
      }

      // Initialize immediately if container has dimensions
      initializeWidget(container, containerRect.width || container.offsetWidth || 640);
    }, 100); // Reduced from 300ms to 100ms (match FlashcardDeck)

    return () => {
      clearTimeout(timeoutId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy?.();
        } catch (e) {
          console.warn('[Youglish] Cleanup error:', e);
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

          {widgetError ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center space-y-4">
              <p className="text-sm text-gray-600">
                Unable to load interactive widget. View examples directly on Youglish:
              </p>
              <a
                href={`https://youglish.com/pronounce/${encodeURIComponent(currentWord)}/english`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm font-medium"
              >
                <Volume2 size={16} />
                Open &quot;{currentWord}&quot; on Youglish
              </a>
            </div>
          ) : (
            <>
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
                  style={{ minHeight: '300px', width: '100%', maxWidth: '100%' }}
                />
              </div>

              <p className="text-xs text-gray-500 text-center">
                Watch native speakers pronounce &quot;{currentWord}&quot; in real contexts
              </p>
            </>
          )}
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
