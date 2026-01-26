'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Lightbulb,
  MapPin,
  Mic,
  Languages,
  Wand2,
  Bookmark,
  Loader2,
  Copy,
} from 'lucide-react';
import { Scenario, DialogueLine, UserLevel } from '@/lib/types';
import { storage } from '@/lib/utils/storage';

interface DialogueScreenProps {
  scenario: Scenario;
  userLevel: UserLevel;
  onBack: () => void;
  onFinish: () => void;
  dialogueId?: string; // For resuming existing dialogue
}

export default function DialogueScreen({
  scenario,
  userLevel,
  onBack,
  onFinish,
  dialogueId,
}: DialogueScreenProps) {
  const [currentDialogueId] = useState(dialogueId || `dialogue_${Date.now()}`);
  const [messages, setMessages] = useState<DialogueLine[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Selection State
  const [selectionMenu, setSelectionMenu] = useState<{
    x: number;
    y: number;
    text: string;
    context: string; // Add full sentence context
  } | null>(null);
  const [selectionActionLoading, setSelectionActionLoading] = useState(false);
  const [selectionResult, setSelectionResult] = useState<{
    type: 'translate' | 'optimize';
    text: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);

  // Initialize chat with AI's first line or load existing dialogue
  useEffect(() => {
    if (dialogueId) {
      // Load existing dialogue
      const scenarios = storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      const currentScenario = scenarios.find((s: Scenario) => s.id === scenario.id);
      const existingDialogue = currentScenario?.dialogues?.find((d: any) => d.id === dialogueId);
      
      if (existingDialogue) {
        setMessages(existingDialogue.messages);
        return;
      }
    }
    
    // New dialogue
    const initialMessages = [
      {
        id: '1',
        speaker: 'ai' as const,
        text: `Hello! Welcome to ${scenario.location}. ${scenario.situation}`,
      },
    ];
    setMessages(initialMessages);
    setHints(['Hello!', 'Hi there!', 'Good to meet you!']);
    
    // Save initial state
    saveDialogueProgress(initialMessages, false);
  }, [scenario, dialogueId]);

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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle text selection with context - Mobile optimized
  useEffect(() => {
    const handleSelectionChange = () => {
      // Clear any pending timeout
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

      if (
        chatContainerRef.current &&
        chatContainerRef.current.contains(range.commonAncestorContainer)
      ) {
        // Get full sentence context
        let contextElement = range.commonAncestorContainer.parentElement;
        let context = '';
        
        // Walk up the DOM to find the message container
        while (contextElement && !contextElement.classList.contains('message-text')) {
          contextElement = contextElement.parentElement;
        }
        
        if (contextElement) {
          context = contextElement.textContent || '';
        } else {
          context = text; // Fallback to selected text
        }

        // On mobile, delay menu display to allow selection to complete
        const delay = isMobile ? 300 : 0;
        
        selectionTimeoutRef.current = setTimeout(() => {
          // Re-check selection is still valid
          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.isCollapsed || 
              currentSelection.toString().trim() !== text) {
            return;
          }

          // Calculate menu position - optimized for mobile
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

          // Mobile-specific positioning
          if (isMobile) {
            // Center horizontally on mobile
            menuX = viewportWidth / 2;
            
            // Position above selection if there's space, otherwise below
            const menuHeight = 200; // Approximate menu height for vertical layout
            const spaceAbove = rect.top - safeAreaTop;
            const spaceBelow = safeAreaBottom - rect.bottom;
            
            if (spaceAbove > menuHeight + 20) {
              // Position above
              menuY = rect.top - menuHeight - 10;
            } else if (spaceBelow > menuHeight + 20) {
              // Position below
              menuY = rect.bottom + 10;
            } else {
              // Center vertically if no space
              menuY = (rect.top + rect.bottom) / 2 - menuHeight / 2;
            }
          } else {
            // Desktop positioning
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

    // Handle touch events for mobile
    const handleTouchEnd = (e: TouchEvent) => {
      // Small delay to allow selection to complete
      setTimeout(() => {
        handleSelectionChange();
      }, 100);
    };

    // Close menu when clicking outside
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (selectionMenu && 
          !target.closest('[class*="selection"]') && 
          !target.closest('.message-text') &&
          !target.closest('button')) {
        // Clear selection if clicking outside
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

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const textToSend = inputValue;
    setInputValue('');
    setIsProcessing(true);
    setShowSuggestions(false);

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, speaker: 'user', text: textToSend },
    ]);

    try {
      const history = messages.map((m) => ({
        role: m.speaker === 'ai' ? 'model' : 'user',
        text: m.text,
      }));

      const response = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          userText: textToSend,
          scenarioContext: scenario.context,
          level: userLevel,
        }),
      });

      if (!response.ok) throw new Error('Dialogue failed');

      const result = await response.json();

      // Build updated messages array
      let updatedMessages = messages.map((m) => {
        if (m.id === userMsgId) return { ...m, feedback: result.feedback };
        return m;
      });

      // Add user message if not already in the list
      if (!updatedMessages.find((m) => m.id === userMsgId)) {
        updatedMessages = [
          ...updatedMessages,
          { id: userMsgId, speaker: 'user' as const, text: textToSend, feedback: result.feedback },
        ];
      }

      // Add AI response
      if (result.next_response) {
        updatedMessages = [
          ...updatedMessages,
          {
            id: (Date.now() + 1).toString(),
            speaker: 'ai' as const,
            text: result.next_response,
          },
        ];
      }

      // Update state
      setMessages(updatedMessages);

      if (result.next_hints && result.next_hints.length > 0) {
        setHints(result.next_hints);
        setShowSuggestions(true);
      }

      // Save after each message exchange
      saveDialogueProgress(updatedMessages, result.is_finished);

      if (result.is_finished) {
        setTimeout(() => {
          onFinish();
        }, 2000);
      }
    } catch (error) {
      console.error('Dialogue error:', error);
      alert('Failed to get response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Real-time save function
  const saveDialogueProgress = useCallback((currentMessages: DialogueLine[], isCompleted: boolean = false) => {
    try {
      const scenarios = storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      const scenarioIndex = scenarios.findIndex((s: Scenario) => s.id === scenario.id);
      
      if (scenarioIndex === -1) {
        console.warn('Scenario not found for saving dialogue');
        return;
      }
      
      // Calculate average score
      const userMessagesWithFeedback = currentMessages.filter(
        (m) => m.speaker === 'user' && m.feedback?.score
      );
      const avgScore = userMessagesWithFeedback.length > 0
        ? userMessagesWithFeedback.reduce((sum, m) => sum + (m.feedback!.score), 0) / userMessagesWithFeedback.length
        : 0;
      
      const dialogueRecord = {
        id: currentDialogueId,
        messages: currentMessages,
        timestamp: Date.now(),
        user_level: userLevel,
        is_completed: isCompleted,
        average_score: Math.round(avgScore),
      };
      
      const dialogues = scenarios[scenarioIndex].dialogues || [];
      const dialogueIndex = dialogues.findIndex((d: any) => d.id === currentDialogueId);
      
      if (dialogueIndex === -1) {
        dialogues.unshift(dialogueRecord); // Add new dialogue at the beginning
      } else {
        dialogues[dialogueIndex] = dialogueRecord; // Update existing
      }
      
      // Update scenario stats
      const completedDialogues = dialogues.filter((d: any) => d.is_completed);
      scenarios[scenarioIndex].dialogues = dialogues;
      scenarios[scenarioIndex].total_attempts = completedDialogues.length;
      scenarios[scenarioIndex].best_score = Math.max(
        ...completedDialogues.map((d: any) => d.average_score || 0),
        0
      );
      scenarios[scenarioIndex].last_practiced = Date.now();
      
      storage.setItem('speakSnapScenarios', scenarios);
      console.log('✅ Real-time save:', isCompleted ? 'Completed' : 'In progress');
    } catch (error) {
      console.error('❌ Failed to save dialogue:', error);
    }
  }, [scenario.id, currentDialogueId, userLevel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

    // Close menu immediately for better UX
    setSelectionMenu(null);

    // Show processing state briefly
    const processingToast = document.createElement('div');
    processingToast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-50 animate-in fade-in';
    processingToast.textContent = '🔄 Generating flashcard...';
    document.body.appendChild(processingToast);

    try {
      // Generate detailed flashcard content via AI
      const response = await fetch('/api/flashcard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          context: context,
          scenario: scenario.location,
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
        context: `${scenario.location} - ${scenario.situation}`,
        image_url: scenario.image_url,
        timestamp: Date.now(),
        source: 'dialogue',
      };

      const cards = storage.getItem('speakSnapFlashcards') || [];
      storage.setItem('speakSnapFlashcards', [newCard, ...cards]);

      // Update toast to success
      processingToast.textContent = '✅ Flashcard saved!';
      processingToast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-sm z-50 animate-in fade-in';
      setTimeout(() => {
        processingToast.remove();
      }, 2000);
    } catch (error) {
      console.error('Failed to generate flashcard:', error);
      
      // Fallback: save basic card
      const basicCard = {
        id: Date.now().toString(),
        front: selectedText,
        back: {
          translation: 'Translation pending...',
          definition: `From: ${context}`,
        },
        context: scenario.location,
        image_url: scenario.image_url,
        timestamp: Date.now(),
        source: 'dialogue',
      };

      const cards = storage.getItem('speakSnapFlashcards') || [];
      storage.setItem('speakSnapFlashcards', [basicCard, ...cards]);

      processingToast.textContent = '✅ Basic card saved!';
      setTimeout(() => {
        processingToast.remove();
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-primary-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-end p-4 pt-6 bg-gradient-to-b from-primary-50 via-primary-50/90 to-transparent pointer-events-none">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-float border border-white/50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all pointer-events-auto active:scale-95 hover:bg-white"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-0 pb-48 space-y-6 bg-transparent relative"
      >
        <div className="h-14 w-full" />

        {/* Scenario Intro */}
        <div className="flex flex-col items-center justify-center w-full mb-8 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="relative mb-5">
            <div className="w-24 h-24 rounded-[32px] overflow-hidden shadow-float bg-white ring-4 ring-white transform transition-transform duration-500 hover:scale-105">
              {scenario.image_url ? (
                <img
                  src={scenario.image_url}
                  alt={scenario.location}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                  <MapPin size={24} />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
            </div>
          </div>

          <div className="text-center px-4 max-w-[85%]">
            <h3 className="text-primary-900 font-bold text-lg tracking-tight mb-1">
              {scenario.location}
            </h3>
            <p className="text-gray-500 text-[13px] font-medium leading-relaxed">
              {scenario.situation}
            </p>
          </div>
        </div>

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.speaker === 'user' ? (
              <div className="flex flex-col items-end max-w-[85%]">
                <div className="message-text bg-[#292929] text-white px-3.5 py-2 rounded-2xl rounded-br-sm shadow-sm relative text-[15px] font-medium leading-relaxed selection:bg-white/30 selection:text-white">
                  {msg.text}
                  <svg
                    className="absolute -right-[5px] bottom-0 text-[#292929] fill-current"
                    width="14"
                    height="17"
                    viewBox="0 0 14 17"
                  >
                    <path d="M9 7C9 13 11.0317 15 14 17C10.1398 17 4.78616 16.7484 2 13.2116L9 0V7Z" />
                  </svg>
                </div>
                {msg.feedback && (
                  <div className="mt-2 mr-1 max-w-full bg-white/60 border border-black/5 rounded-xl p-2.5 text-xs text-gray-600 backdrop-blur-sm animate-in fade-in slide-in-from-top">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          msg.feedback.score > 80 ? 'bg-green-500' : 'bg-orange-400'
                        }`}
                      />
                      <span className="font-semibold text-gray-800">Feedback</span>
                    </div>
                    <p>{msg.feedback.comment}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start max-w-[90%]">
                <div className="message-text text-[#191D20] text-[15px] font-medium leading-relaxed px-1 selection:bg-blue-200 selection:text-black">
                  {msg.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-start px-1 animate-pulse">
            <div className="text-gray-400 text-sm font-medium">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selection Menu - Mobile Optimized */}
      {selectionMenu && !selectionResult && (
        <div
          className={`fixed z-50 ${isMobile ? 'flex-col items-center' : 'flex-row items-center'} gap-1 p-1.5 bg-[#1D1D1D] rounded-2xl shadow-2xl animate-in zoom-in fade-in duration-200 backdrop-blur-sm border border-white/10`}
          style={{
            left: isMobile ? '50%' : Math.min(Math.max(10, selectionMenu.x - (isMobile ? 0 : 70)), window.innerWidth - (isMobile ? 0 : 150)),
            top: isMobile ? 'auto' : selectionMenu.y - 50,
            bottom: isMobile ? '120px' : 'auto',
            transform: isMobile ? 'translateX(-50%)' : 'none',
            maxWidth: isMobile ? '90vw' : 'none',
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {selectionActionLoading ? (
            <div className={`${isMobile ? 'w-full' : ''} px-4 py-2.5 flex items-center justify-center gap-2`}>
              <Loader2 size={18} className="animate-spin text-white" />
              <span className="text-white text-sm font-medium">Processing...</span>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTranslate();
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className={`${isMobile ? 'w-full justify-center' : ''} p-3 text-white/90 active:text-white active:bg-white/15 rounded-xl transition-all flex items-center gap-2 touch-manipulation`}
                title="Translate"
              >
                <Languages size={18} />
                {isMobile && <span className="text-sm font-medium">Translate</span>}
              </button>
              {!isMobile && <div className="w-[1px] h-4 bg-white/20"></div>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptimize();
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className={`${isMobile ? 'w-full justify-center' : ''} p-3 text-white/90 active:text-white active:bg-white/15 rounded-xl transition-all flex items-center gap-2 touch-manipulation`}
                title="Optimize"
              >
                <Wand2 size={18} />
                {isMobile && <span className="text-sm font-medium">Optimize</span>}
              </button>
              {!isMobile && <div className="w-[1px] h-4 bg-white/20"></div>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToFlashcard();
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className={`${isMobile ? 'w-full justify-center' : ''} p-3 text-white/90 active:text-white active:bg-white/15 rounded-xl transition-all flex items-center gap-2 touch-manipulation`}
                title="Add to Flashcard"
              >
                <Bookmark size={18} />
                {isMobile && <span className="text-sm font-medium">Save</span>}
              </button>
            </>
          )}
          {!isMobile && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#1D1D1D]"></div>
          )}
        </div>
      )}

      {/* Selection Result Popup - Mobile Optimized */}
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
              <span className="text-sm font-bold text-gray-800">
                {selectionResult.type === 'translate' ? 'Translation' : 'Optimization'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectionResult(null);
                setSelectionMenu(null);
              }}
              onTouchStart={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 active:text-gray-800 active:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-primary-900 text-[15px] leading-relaxed mb-3 break-words">
            {selectionResult.text}
          </p>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(selectionResult.text);
                // Mobile-friendly feedback
                if (isMobile) {
                  const btn = e.currentTarget;
                  const originalText = btn.innerHTML;
                  btn.innerHTML = '<span class="text-green-600">✓</span>';
                  setTimeout(() => {
                    btn.innerHTML = originalText;
                  }, 1000);
                } else {
                  alert('Copied!');
                }
              }}
              onTouchStart={(e) => e.stopPropagation()}
              className={`${isMobile ? 'flex-1' : 'w-10'} h-10 flex items-center justify-center bg-gray-100 rounded-xl text-gray-600 active:bg-gray-200 transition-colors touch-manipulation`}
            >
              {isMobile ? (
                <span className="text-sm font-medium flex items-center gap-2">
                  <Copy size={16} />
                  Copy
                </span>
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-3 pb-6 border-t border-black/5 z-40 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {/* Suggestions */}
        {showSuggestions && hints.length > 0 && (
          <div className="mb-3 flex flex-col animate-in slide-in-from-bottom fade-in">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Lightbulb size={14} className="text-yellow-600" fill="currentColor" />
                <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                  Suggestions
                </span>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {hints.map((hint, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(hint)}
                  className="h-7 px-3 rounded-[8px] bg-[#F0F4F9] text-[#1F1F1F] text-[11px] font-medium hover:bg-[#E2E7EB] transition-colors whitespace-nowrap shrink-0"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="w-full bg-white rounded-xl border border-gray-200 focus-within:border-gray-300 focus-within:shadow-sm transition-all flex items-center p-1.5 pl-4 gap-2">
          <input
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Ask the tutor...'}
            className="flex-1 bg-transparent text-primary-900 placeholder:text-gray-400 text-[16px] outline-none min-w-0"
          />

          <button
            onClick={handleVoiceInput}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              isListening
                ? 'bg-red-50 text-red-500 animate-pulse'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            <Mic size={18} />
          </button>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`
              flex items-center justify-center h-9 px-4 rounded-lg text-sm font-bold transition-all
              ${
                inputValue.trim()
                  ? 'bg-black text-white shadow-md hover:bg-gray-800 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <span>Go</span>
          </button>
        </div>
      </div>
    </div>
  );
}
