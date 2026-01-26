'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Volume2, Trash2, BookOpen, MessageCircle, ChevronUp, ChevronDown, Youtube } from 'lucide-react';
import { Flashcard } from '@/lib/types';

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

  useEffect(() => {
    try {
      const savedCards = localStorage.getItem('speakSnapFlashcards');
      if (savedCards) setFlashcards(JSON.parse(savedCards));
    } catch (e) {
      console.error('Failed to load flashcards', e);
    }
  }, []);

  useEffect(() => {
    setIsFlipped(false);
  }, [activeIndex]);

  const playAudio = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const deleteCurrentCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCard = flashcards[activeIndex];
    if (!currentCard) return;

    const updated = flashcards.filter((f) => f.id !== currentCard.id);
    setFlashcards(updated);
    localStorage.setItem('speakSnapFlashcards', JSON.stringify(updated));

    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
    setIsFlipped(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

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
    } else if (isTap) {
      setIsFlipped((prev) => !prev);
    }

    setDragOffset({ x: 0, y: 0 });
    touchStartRef.current = null;
  };

  const nextVideo = (cardId: string, total: number) => {
    setCurrentVideoIndices((prev) => ({
      ...prev,
      [cardId]: ((prev[cardId] || 0) + 1) % total,
    }));
    // Reset error state when changing video
    setVideoErrors((prev) => ({
      ...prev,
      [cardId]: false,
    }));
  };

  const prevVideo = (cardId: string, total: number) => {
    setCurrentVideoIndices((prev) => ({
      ...prev,
      [cardId]: ((prev[cardId] || 0) - 1 + total) % total,
    }));
    // Reset error state when changing video
    setVideoErrors((prev) => ({
      ...prev,
      [cardId]: false,
    }));
  };

  const handleVideoError = (cardId: string) => {
    setVideoErrors((prev) => ({
      ...prev,
      [cardId]: true,
    }));
  };

  const handleVideoLoad = (cardId: string) => {
    setVideoLoaded((prev) => ({
      ...prev,
      [cardId]: true,
    }));
  };

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
        className="relative w-full aspect-[9/16] max-h-[520px] max-w-[360px]"
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
                  <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/10 via-transparent to-black/85 pointer-events-none"></div>

                  {/* Touch Layer */}
                  <div className="absolute inset-0 z-20"></div>

                  {/* Top Metadata */}
                  <div className="absolute top-4 right-4 z-30 flex justify-end items-start pointer-events-none">
                    <div className="text-[10px] font-mono text-white/50 bg-black/30 px-2 py-1 rounded-full backdrop-blur-md">
                      {index + 1} / {flashcards.length}
                    </div>
                  </div>

                  {/* Video Navigation Indicators */}
                  {videoIds.length > 1 && !isFlipped && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 items-center pointer-events-none opacity-60">
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
                    <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-600/80 backdrop-blur-sm pointer-events-none">
                      <Youtube size={12} className="text-white" />
                      <span className="text-[9px] font-medium text-white uppercase tracking-wider">
                        {currentVidIndex + 1}/{videoIds.length}
                      </span>
                    </div>
                  )}

                  {/* Bottom Content */}
                  <div className="absolute bottom-0 left-0 right-0 z-30 p-5 pb-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2.5 mb-1">
                          <h3 className="text-3xl font-black text-white leading-none tracking-tight drop-shadow-xl">
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
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h4 className="text-2xl font-bold tracking-tight">{front}</h4>
                    <button
                      onClick={deleteCurrentCard}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors pointer-events-auto"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Content Scroll */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
                    {/* Translation */}
                    <div>
                      <p className="text-3xl font-medium text-gray-900 leading-snug">{back.translation}</p>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Definition */}
                    {back.definition && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600">
                          <BookOpen size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">Grammar & Note</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                          {back.definition}
                        </p>
                      </div>
                    )}

                    {/* Native Usage */}
                    {back.native_usage && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-purple-600">
                          <MessageCircle size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">Native Usage</span>
                        </div>
                        <p className="text-sm text-gray-700 italic font-medium">"{back.native_usage}"</p>
                      </div>
                    )}

                    {/* Example */}
                    {back.example && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-xs font-bold uppercase tracking-widest">Example</span>
                        </div>
                        <div className="pl-3 border-l-2 border-gray-200">
                          <p className="text-base text-gray-800">{back.example}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 text-center border-t border-gray-50">
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
