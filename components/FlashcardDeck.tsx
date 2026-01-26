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
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null); // 当前播放的视频ID
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const savedCards = storage.getItem<Flashcard[]>('speakSnapFlashcards');
    console.log('📚 Loading flashcards:', savedCards?.length || 0, 'cards');
    if (savedCards && savedCards.length > 0) {
      console.log('First card:', savedCards[0]);
      setFlashcards(savedCards);
    } else {
      console.log('⚠️ No flashcards found in storage');
    }

    // Cleanup: stop all videos when component unmounts
    return () => {
      setPlayingVideoId(null);
    };
  }, []);

  useEffect(() => {
    setIsFlipped(false);
    // Stop any playing video when switching cards
    setPlayingVideoId(null);
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
    } else {
      // Stop video when flipping to front
      setPlayingVideoId(null);
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
    
    // Don't handle touch on interactive elements
    if (target.closest('button')) return;
    
    // Don't handle touch on iframe (back face video)
    if (isFlipped && target.closest('iframe')) return;

    // Always initialize touch tracking
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const target = e.target as HTMLElement;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // If user is scrolling vertically on scrollable content, don't interfere
    if (isFlipped && target.closest('.flashcard-scroll')) {
      const scrollContainer = target.closest('.flashcard-scroll') as HTMLElement;
      const isVerticalScroll = absY > absX && absY > 5;
      
      if (isVerticalScroll) {
        // Allow native scroll
        touchStartRef.current = null;
        return;
      }
    }

    // Only set drag offset for horizontal swipes
    if (absX > absY || absX > 10) {
      setDragOffset({
        x: deltaX,
        y: deltaY,
      });
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) {
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    const deltaX = dragOffset.x;
    const deltaY = dragOffset.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const timeDelta = Date.now() - (touchStartRef.current.time || 0);

    const isHorizontalSwipe = absX > absY && absX > 60; // Card swipe threshold
    const isTap = absX < 10 && absY < 10 && timeDelta < 300;

    if (isHorizontalSwipe) {
      // Swipe left/right to change cards
      if (deltaX > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      } else if (deltaX < 0 && activeIndex < flashcards.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
    } else if (isTap) {
      // Quick tap to flip
      const target = document.elementFromPoint(
        touchStartRef.current?.x || 0,
        touchStartRef.current?.y || 0
      ) as HTMLElement;
      
      // Don't flip if on button, video thumbnail, or actively scrolling content
      const isOnButton = target && target.closest('button');
      const isOnVideo = target && target.closest('[data-video-thumbnail]');
      const isOnScrollArea = target && target.closest('.flashcard-scroll');
      
      // Only flip if not on interactive elements
      if (!isOnButton && !isOnVideo) {
        // On scroll area, only flip if at top (not mid-scroll)
        if (isOnScrollArea) {
          const scrollEl = isOnScrollArea as HTMLElement;
          if (scrollEl.scrollTop < 5) {
            setIsFlipped(!isFlipped);
          }
        } else {
          setIsFlipped(!isFlipped);
        }
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
    console.log('🚫 Flashcards empty, showing empty state');
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

  console.log('✅ Rendering', flashcards.length, 'flashcards, active:', activeIndex);

  return (
    <div className="flex-1 flex flex-col items-center relative perspective-[1200px] min-h-[500px] w-full">
      <div
        className="relative w-full flex-1 max-h-[calc(100vh-240px)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'pan-y pinch-zoom',
          WebkitTapHighlightColor: 'transparent',
        }}
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
                className="relative w-full h-full shadow-2xl rounded-[24px] select-none"
                style={{ 
                  transform: isActive && isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                  transformStyle: 'preserve-3d',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Front Face - Apple Style Card */}
                <div 
                  className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden flex flex-col"
                  style={{ 
                    backfaceVisibility: 'hidden', 
                    WebkitBackfaceVisibility: 'hidden',
                    backgroundColor: '#007AFF',  // Apple 蓝色
                    zIndex: 2
                  }}
                >
                  {/* Card counter */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="text-[10px] font-mono text-white/70 bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-md">
                      {index + 1} / {flashcards.length}
                    </div>
                  </div>

                  {/* Touch Layer - Click to flip */}
                  <div 
                    className="absolute inset-0 cursor-pointer touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && !target.closest('.front-footer') && isActive) {
                        console.log('🖱️ Front card click - flipping to back');
                        setIsFlipped(!isFlipped);
                      }
                    }}
                  ></div>

                  {/* Main Content */}
                  <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                    <div className="flex flex-col items-center gap-6 max-w-md w-full">
                      {/* Word */}
                      <h3 className="text-5xl md:text-6xl font-black text-white text-center leading-none tracking-tight drop-shadow-2xl">
                        {front}
                      </h3>

                      {/* Phonetic */}
                      {back.phonetic && (
                        <p className="text-white/90 font-mono text-xl tracking-wide drop-shadow-lg">
                          /{back.phonetic}/
                        </p>
                      )}

                      {/* Play Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(front, e);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/25 backdrop-blur-xl border-2 border-white/40 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-2xl pointer-events-auto group"
                        aria-label="Play pronunciation"
                      >
                        <Volume2 size={24} className="opacity-90 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>

                  {/* Footer - Tap to flip - Apple Frosted Glass */}
                  <div 
                    className="front-footer flex-shrink-0 py-5 px-4 text-center cursor-pointer transition-all pointer-events-auto relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(to top, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.05) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      boxShadow: '0 -1px 0 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.2) 10%, rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.2) 10%, rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 100%)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive) {
                        setIsFlipped(!isFlipped);
                      }
                    }}
                    onTouchStart={(e) => {
                      const target = e.currentTarget;
                      target.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.18) 25%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%)';
                    }}
                    onTouchEnd={(e) => {
                      const target = e.currentTarget;
                      target.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.05) 100%)';
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                      </svg>
                      <span className="text-[10px] text-white/80 uppercase tracking-widest font-medium">
                        Tap to flip
                      </span>
                    </div>
                  </div>

                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
                </div>

                {/* Back Face */}
                <div
                  className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden flex flex-col text-primary-900"
                  style={{ 
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    backgroundColor: '#FFFFFF',
                    zIndex: 1
                  }}
                >
                  {/* Video Popup Overlay - Only show on active card */}
                  {isActive && playingVideoId && (
                    <div 
                      className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                      onClick={() => setPlayingVideoId(null)}
                    >
                      <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <iframe
                          key={`${card.id}-${playingVideoId}`}
                          src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                          title="Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingVideoId(null);
                          }}
                          className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all active:scale-95"
                          aria-label="Close video"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Compact Header with Delete */}
                  <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <h4 className="text-3xl font-bold text-gray-900 tracking-tight">{front}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCurrentCard(e);
                      }}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors pointer-events-auto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Scrollable Content Panel */}
                  <div 
                    ref={(el) => { scrollRefs.current[card.id] = el; }}
                    className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 bg-white flashcard-scroll"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      touchAction: 'pan-y',
                    }}
                  >
                    {/* Phonetic & Audio */}
                    {back.phonetic && (
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 font-mono text-sm">/{back.phonetic}/</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(front, e);
                          }}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="flashcard-audio-btn rounded-full bg-blue-50 transition-colors pointer-events-auto flex items-center justify-center"
                        >
                          <Volume2 size={16} className="text-blue-600" />
                        </button>
                      </div>
                    )}

                    {/* Translation */}
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{back.translation}</p>
                    </div>

                    {/* Definition - Full */}
                    {back.definition && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <BookOpen size={12} className="text-blue-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Definition</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{back.definition}</p>
                      </div>
                    )}

                    {/* Example - Full */}
                    {back.example && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={12} className="text-emerald-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Example</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed italic">"{back.example}"</p>
                      </div>
                    )}

                    {/* YouTube Videos OR Native Tips - 优先显示 YouTube，互斥显示 */}
                    {videoIds.length > 0 ? (
                      // 有视频时显示 YouTube Videos
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Youtube size={14} className="text-red-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Videos</span>
                        </div>
                        <div 
                          className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
                          style={{
                            WebkitOverflowScrolling: 'touch',
                            scrollSnapType: 'x proximity',
                            touchAction: 'pan-x',
                          }}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                        >
                          {videoIds.map((vidId, idx) => (
                            <div
                              key={vidId}
                              data-video-thumbnail
                              className="flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-900 cursor-pointer hover:opacity-90 transition-all active:scale-95"
                              style={{ 
                                width: '116px', 
                                height: '64px',
                                scrollSnapAlign: 'start',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActive) {
                                  setPlayingVideoId(vidId);
                                }
                              }}
                              onTouchEnd={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <img
                                src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`}
                                alt={`Video ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${vidId}/default.jpg`;
                                }}
                              />
                              {/* Play Icon */}
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                              {/* Index */}
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                                <span className="text-[9px] font-semibold text-white">{idx + 1}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // 没有视频时显示 Native Tips
                      back.native_usage && (
                        <div className="space-y-1.5 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-500 uppercase">💬 Native Tips</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{back.native_usage}</p>
                        </div>
                      )
                    )}

                  </div>

                  {/* Footer - Tap to flip - Apple Frosted Glass */}
                  <div 
                    className="flex-shrink-0 py-5 px-4 text-center cursor-pointer transition-all relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.88) 25%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0.75) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      boxShadow: '0 -1px 0 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.2) 10%, rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.2) 10%, rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 100%)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(false);
                    }}
                    onTouchStart={(e) => {
                      const target = e.currentTarget;
                      target.style.background = 'linear-gradient(to top, rgba(240, 240, 240, 0.98) 0%, rgba(243, 243, 243, 0.96) 25%, rgba(245, 245, 245, 0.95) 50%, rgba(250, 250, 250, 0.9) 100%)';
                    }}
                    onTouchEnd={(e) => {
                      const target = e.currentTarget;
                      target.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.88) 25%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0.75) 100%)';
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                      </svg>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                        Tap to flip
                      </span>
                    </div>
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
