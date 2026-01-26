'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bookmark, Volume2, Trash2, BookOpen, MessageCircle, ChevronUp, ChevronDown, Youtube } from 'lucide-react';
import { Flashcard } from '@/lib/types';
import { storage } from '@/lib/utils/storage';

export default function FlashcardDeck() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentVideoIndices, setCurrentVideoIndices] = useState<{ [key: string]: number }>({});
  const [videoErrors, setVideoErrors] = useState<{ [key: string]: boolean }>({});
  const [videoLoaded, setVideoLoaded] = useState<{ [key: string]: boolean }>({});
  
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const savedCards = storage.getItem<Flashcard[]>('speakSnapFlashcards');
    if (savedCards) setFlashcards(savedCards);
  }, []);

  useEffect(() => {
    setIsFlipped(false);
    // Reset scroll position when switching cards
    Object.values(scrollRefs.current).forEach((el) => {
      if (el) el.scrollTop = 0;
    });
  }, [activeIndex]);

  useEffect(() => {
    // Reset scroll position when flipping to back
    if (isFlipped) {
      const currentCard = flashcards[activeIndex];
      if (currentCard) {
        const scrollEl = scrollRefs.current[currentCard.id];
        if (scrollEl) {
          scrollEl.scrollTop = 0;
        }
      }
    }
  }, [isFlipped, activeIndex, flashcards]);

  const playAudio = useCallback((text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }, []);

  const deleteCurrentCard = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCard = flashcards[activeIndex];
    if (!currentCard) return;

    const updated = flashcards.filter((f) => f.id !== currentCard.id);
    setFlashcards(updated);
    storage.setItem('speakSnapFlashcards', updated);

    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
    setIsFlipped(false);
  }, [flashcards, activeIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    // Don't handle touch if it's on the scrollable content area (back face)
    if (isFlipped && target.closest('.flashcard-scroll')) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    setDragOffset({
      x: currentX - touchStartRef.current.x,
      y: currentY - touchStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;

    const deltaX = dragOffset.x;
    const deltaY = dragOffset.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const isHorizontalSwipe = absX > absY && absX > 60;
    const isVerticalSwipe = absY > absX && absY > 60;
    const isTap = absX < 10 && absY < 10;

    if (isHorizontalSwipe) {
      if (deltaX > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      } else if (deltaX < 0 && activeIndex < flashcards.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
    } else if (isVerticalSwipe && !isFlipped) {
      const currentCard = flashcards[activeIndex];
      const videoIds = currentCard?.back?.video_ids || [];
      if (videoIds.length > 1) {
        if (deltaY < 0) {
          nextVideo(currentCard.id, videoIds.length);
        } else {
          prevVideo(currentCard.id, videoIds.length);
        }
      }
    } else if (isTap && !isFlipped) {
      // Only allow tap to flip when on front face
      setIsFlipped((prev) => !prev);
    } else if (isTap && isFlipped) {
      // On back face, tap outside scroll area to flip back
      const target = (document.activeElement || document.elementFromPoint(
        touchStartRef.current?.x || 0,
        touchStartRef.current?.y || 0
      )) as HTMLElement;
      
      if (target && !target.closest('.flashcard-scroll')) {
        setIsFlipped(false);
      }
    }

    setDragOffset({ x: 0, y: 0 });
    touchStartRef.current = null;
  };

  const nextVideo = useCallback((cardId: string, total: number) => {
    setCurrentVideoIndices((prev) => ({
      ...prev,
      [cardId]: ((prev[cardId] || 0) + 1) % total,
    }));
    // Reset error state when changing video
    setVideoErrors((prev) => ({
      ...prev,
      [cardId]: false,
    }));
  }, []);

  const prevVideo = useCallback((cardId: string, total: number) => {
    setCurrentVideoIndices((prev) => ({
      ...prev,
      [cardId]: ((prev[cardId] || 0) - 1 + total) % total,
    }));
    // Reset error state when changing video
    setVideoErrors((prev) => ({
      ...prev,
      [cardId]: false,
    }));
  }, []);

  const handleVideoError = useCallback((cardId: string) => {
    setVideoErrors((prev) => ({
      ...prev,
      [cardId]: true,
    }));
  }, []);

  const handleVideoLoad = useCallback((cardId: string) => {
    setVideoLoaded((prev) => ({
      ...prev,
      [cardId]: true,
    }));
  }, []);

  if (flashcards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[500px]">
        <div className="bg-white rounded-2xl p-8 text-center shadow-float border border-gray-100/50 w-full animate-in fade-in">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="text-gray-300" size={32} />
          </div>
          <h3 className="font-semibold text-gray-900">No cards yet</h3>
          <p className="text-gray-500 text-sm mt-1">Select text in a dialogue to save it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative perspective-[1200px] min-h-[500px]">
      <div
        className="relative w-full h-full max-h-[calc(100vh-240px)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {flashcards.map((card, index) => {
          if (index < activeIndex - 1 || index > activeIndex + 2) return null;

          const isActive = index === activeIndex;
          const isNext = index === activeIndex + 1;
          const isPrev = index < activeIndex;

          const front = card.front;
          const back = card.back;
          const videoIds = back.video_ids || [];
          const currentVidIndex = currentVideoIndices[card.id] || 0;
          const currentVideoId = videoIds.length > 0 ? videoIds[currentVidIndex] : null;
          const hasVideoError = videoErrors[card.id] || false;
          const isVideoLoaded = videoLoaded[card.id] || false;

          let style: React.CSSProperties = {
            zIndex: flashcards.length - index,
            transition: isPrev
              ? 'transform 0.4s ease-in, opacity 0.4s'
              : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s',
            transform: 'translate3d(0,0,0) scale(1)',
            opacity: 1,
          };

          if (isActive) {
            style.transform = `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.2}px, 0) rotate(${dragOffset.x * 0.05}deg)`;
          } else if (isNext) {
            style.transform = 'translate3d(0, 15px, -40px) scale(0.95)';
            style.opacity = 1;
          } else if (index === activeIndex + 2) {
            style.transform = 'translate3d(0, 30px, -80px) scale(0.9)';
            style.opacity = 0;
          } else if (isPrev) {
            style.transform = 'translate3d(-150%, 0, 0) rotate(-20deg)';
            style.opacity = 0;
          }

          return (
            <div key={card.id} className="absolute inset-0 w-full h-full" style={style}>
              <div
                className="relative w-full h-full duration-500 shadow-2xl rounded-[24px] [transform-style:preserve-3d] bg-black"
                style={{ transform: isActive && isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* Front Face */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[24px] overflow-hidden bg-black flex flex-col">
                  {/* Video Layer */}
                  <div className="absolute inset-0 z-0">
                    {currentVideoId && !hasVideoError ? (
                      <>
                        {/* Loading skeleton */}
                        {!isVideoLoaded && (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white/80 animate-spin" />
                            </div>
                          </div>
                        )}
                        <iframe
                          key={currentVideoId}
                          ref={(el) => { iframeRefs.current[card.id] = el; }}
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=${isActive && !isFlipped ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${currentVideoId}&mute=${isActive && !isFlipped ? 0 : 1}`}
                          title="Context Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className={`w-full h-full object-cover pointer-events-none scale-[1.35] transition-opacity duration-300 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                          onLoad={() => handleVideoLoad(card.id)}
                          onError={() => handleVideoError(card.id)}
                        />
                      </>
                    ) : (
                      <>
                        {card.image_url ? (
                          <img src={card.image_url} alt="fallback" className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-60" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                          <Youtube size={48} className="text-white/30" />
                          {hasVideoError && (
                            <p className="text-white/50 text-xs px-4 text-center">
                              Video unavailable
                              {videoIds.length > 1 && <br />}
                              {videoIds.length > 1 && 'Swipe to try another'}
                            </p>
                          )}
                          {!currentVideoId && !hasVideoError && (
                            <p className="text-white/50 text-xs px-4 text-center">
                              No videos found
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none"></div>

                  {/* Touch Layer */}
                  <div className="absolute inset-0 z-20"></div>

                  {/* Top Metadata */}
                  <div className="absolute top-4 right-4 z-40 flex justify-end items-start pointer-events-none">
                    <div className="text-[10px] font-mono text-white/60 bg-black/40 px-2 py-1 rounded-full backdrop-blur-md">
                      {index + 1} / {flashcards.length}
                    </div>
                  </div>

                  {/* Video Navigation Indicators */}
                  {videoIds.length > 1 && !isFlipped && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 items-center pointer-events-none opacity-60">
                      <ChevronUp size={20} className="text-white animate-bounce-subtle" />
                      <div className="flex flex-col gap-0.5 py-2">
                        {videoIds.map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1.5 w-1.5 rounded-full transition-all ${
                              idx === currentVidIndex
                                ? 'bg-white scale-125'
                                : 'bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                      <ChevronDown size={20} className="text-white animate-bounce-subtle" />
                    </div>
                  )}

                  {/* Video source indicator */}
                  {currentVideoId && !hasVideoError && isActive && (
                    <div className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-600/80 backdrop-blur-sm pointer-events-none">
                      <Youtube size={12} className="text-white" />
                      <span className="text-[9px] font-medium text-white uppercase tracking-wider">
                        {currentVidIndex + 1}/{videoIds.length}
                      </span>
                    </div>
                  )}

                  {/* Bottom Content */}
                  <div className="absolute bottom-0 left-0 right-0 z-40 p-5 pb-6 pointer-events-none">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2.5 mb-1">
                          <h3 className="text-3xl font-black text-white leading-none tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                            {front}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(front, e);
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/20 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-md pointer-events-auto flex-shrink-0"
                            aria-label="Play pronunciation"
                          >
                            <Volume2 size={14} className="opacity-90" />
                          </button>
                        </div>
                        {back.phonetic && (
                          <p className="text-white/70 font-mono text-xs tracking-wide ml-0.5">/{back.phonetic}/</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back Face */}
                <div
                  className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[24px] overflow-hidden bg-white flex flex-col text-primary-900"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  {/* Header - Fixed */}
                  <div 
                    className="flex-shrink-0 px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 cursor-pointer"
                    onClick={() => setIsFlipped(false)}
                  >
                    <h4 className="text-2xl font-bold tracking-tight flex-1 pr-2">{front}</h4>
                    <button
                      onClick={deleteCurrentCard}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors pointer-events-auto flex-shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Content Scroll - Scrollable with gradient indicators */}
                  <div className="relative flex-1 min-h-0">
                    {/* Top scroll gradient indicator */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent pointer-events-none z-20 transition-opacity duration-200" 
                      id={`scroll-top-indicator-${card.id}`}
                      style={{ opacity: 0 }}
                    />
                    
                    {/* Scrollable content */}
                    <div 
                      className="h-full overflow-y-auto overscroll-contain px-6 py-6 space-y-6 flashcard-scroll"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const topIndicator = document.getElementById(`scroll-top-indicator-${card.id}`);
                        const bottomIndicator = document.getElementById(`scroll-bottom-indicator-${card.id}`);
                        
                        // Show/hide top gradient
                        if (topIndicator) {
                          topIndicator.style.opacity = target.scrollTop > 10 ? '1' : '0';
                        }
                        
                        // Show/hide bottom gradient
                        if (bottomIndicator) {
                          const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 20;
                          bottomIndicator.style.opacity = isNearBottom ? '0' : '1';
                        }
                      }}
                      ref={(el) => {
                        scrollRefs.current[card.id] = el;
                        // Check initial scroll state
                        if (el) {
                          setTimeout(() => {
                            const topIndicator = document.getElementById(`scroll-top-indicator-${card.id}`);
                            const bottomIndicator = document.getElementById(`scroll-bottom-indicator-${card.id}`);
                            
                            if (topIndicator) topIndicator.style.opacity = '0';
                            if (bottomIndicator) {
                              const needsScroll = el.scrollHeight > el.clientHeight;
                              bottomIndicator.style.opacity = needsScroll ? '1' : '0';
                            }
                          }, 100);
                        }
                      }}
                    >
                      {/* Translation */}
                      <div className="pb-2">
                        <p className="text-3xl font-medium text-gray-900 leading-snug">{back.translation}</p>
                      </div>

                      <hr className="border-gray-100 my-4" />

                      {/* Definition */}
                      {back.definition && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <BookOpen size={16} className="flex-shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-widest">Grammar & Note</span>
                          </div>
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{back.definition}</p>
                          </div>
                        </div>
                      )}

                      {/* Native Usage */}
                      {back.native_usage && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-purple-600 mb-2">
                            <MessageCircle size={16} className="flex-shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-widest">Native Usage</span>
                          </div>
                          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">"{back.native_usage}"</p>
                          </div>
                        </div>
                      )}

                      {/* Example */}
                      {back.example && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest">Example</span>
                          </div>
                          <div className="pl-4 border-l-3 border-gray-200 bg-gray-50/50 p-4 rounded-r-xl">
                            <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{back.example}</p>
                          </div>
                        </div>
                      )}

                      {/* Extra padding at bottom for better scroll experience */}
                      <div className="h-6" />
                    </div>

                    {/* Bottom scroll gradient indicator */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none z-20 transition-opacity duration-200" 
                      id={`scroll-bottom-indicator-${card.id}`}
                      style={{ opacity: 1 }}
                    />
                  </div>

                  {/* Footer - Fixed */}
                  <div 
                    className="flex-shrink-0 p-4 text-center border-t border-gray-50 bg-white z-10 cursor-pointer"
                    onClick={() => setIsFlipped(false)}
                  >
                    <span className="text-[10px] text-gray-300 uppercase tracking-widest font-medium">
                      Tap to return to video
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
