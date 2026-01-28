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
  Phone,
  PhoneOff,
} from 'lucide-react';
import { Scenario, DialogueLine, UserLevel } from '@/lib/types';
import { storage } from '@/lib/utils/storage';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';
import { useGeminiLive } from '@/lib/hooks/useGeminiLive';

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
  const [interimText, setInterimText] = useState(''); // 实时识别的临时文本
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [showAudioToast, setShowAudioToast] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [goalProgress, setGoalProgress] = useState<number>(0);
  const [showGoalComplete, setShowGoalComplete] = useState(false);
  const [conversationGoals, setConversationGoals] = useState<string[]>([]);
  const conversationTextRef = useRef<string>('');
  // 打字动画状态
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState<string>('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayAudioRef = useRef(false);
  const lastPlayedMessageIdRef = useRef<string | null>(null);

  // 检测对话目标完成的通用函数
  // 打字动画效果 - 逐字显示AI响应
  const typeMessage = useCallback((messageId: string, fullText: string) => {
    setTypingMessageId(messageId);
    setDisplayedText('');
    
    let currentIndex = 0;
    let lastScrollIndex = 0;
    const CHARS_PER_SCROLL = 8; // 每打8个字符滚动一次
    
    const smoothScrollDown = () => {
      if (!chatContainerRef.current) return;
      
      // 平滑向下滚动，保持打字内容可见
      const currentScroll = chatContainerRef.current.scrollTop;
      const scrollHeight = chatContainerRef.current.scrollHeight;
      const clientHeight = chatContainerRef.current.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      
      // 每次向下滚动 20px（约一行文字的高度）
      const newScroll = Math.min(currentScroll + 20, maxScroll);
      
      chatContainerRef.current.scrollTo({
        top: newScroll,
        behavior: 'smooth',
      });
    };
    
    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
        
        // 每打完指定数量的字符，自动向下滚动
        if (currentIndex - lastScrollIndex >= CHARS_PER_SCROLL) {
          lastScrollIndex = currentIndex;
          requestAnimationFrame(() => {
            smoothScrollDown();
          });
        }
        
        // 根据字符类型调整速度：标点符号稍慢，其他字符快速
        const char = fullText[currentIndex - 1];
        const delay = /[.,!?;:]/.test(char) ? 100 : 20;
        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        setTypingMessageId(null);
        setDisplayedText('');
        // 打字完成后滚动到最底部
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (chatContainerRef.current) {
              const scrollHeight = chatContainerRef.current.scrollHeight;
              chatContainerRef.current.scrollTo({
                top: scrollHeight,
                behavior: 'smooth',
              });
            }
          }, 100);
        });
      }
    };
    
    // 开始打字前先滚动到底部，确保有足够空间
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        const scrollHeight = chatContainerRef.current.scrollHeight;
        chatContainerRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth',
        });
      }
    });
    
    typeNextChar();
  }, []);

  // 清理打字动画
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const checkGoalCompletion = useCallback((text: string) => {
    conversationTextRef.current += ' ' + text;
    
    const completionPhrases = [
      'Have a great day!',
      'Enjoy your meal!',
      'Have a safe flight!',
      'Enjoy your stay!',
      'Happy reading!',
      'Stay motivated!',
      'The doctor will see you soon!',
      'All done!',
      'Your package is on its way!'
    ];

    const isGoalComplete = completionPhrases.some(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );

    if (isGoalComplete && !showGoalComplete) {
      setShowGoalComplete(true);
      setGoalProgress(100);
    } else if (!showGoalComplete) {
      // 根据对话自然进展估算进度
      const progressKeywords = [
        { words: ['hello', 'hi', 'hey'], weight: 10 },
        { words: ['yes', 'okay', 'sure', 'alright'], weight: 20 },
        { words: ['please', 'could', 'would like'], weight: 15 },
        { words: ['thank', 'thanks'], weight: 25 },
        { words: ['perfect', 'great', 'good'], weight: 20 }
      ];
      
      const lowerText = conversationTextRef.current.toLowerCase();
      let calculatedProgress = 0;
      
      progressKeywords.forEach(({ words, weight }) => {
        if (words.some(word => lowerText.includes(word))) {
          calculatedProgress = Math.min(calculatedProgress + weight, 90);
        }
      });
      
      if (calculatedProgress > goalProgress) {
        setGoalProgress(calculatedProgress);
      }
    }
  }, [goalProgress, showGoalComplete]);

  // Gemini Live Integration - 构建场景和NPC角色的系统指令
  const buildSystemInstruction = () => {
    // 根据场景构建NPC角色和对话背景
    const npcRole = {
      'Coffee Shop': 'a friendly barista at a coffee shop',
      'Restaurant': 'a warm and helpful waiter at a restaurant',
      'Airport': 'a professional airline staff member at the airport',
      'Hotel': 'a courteous hotel receptionist',
      'Supermarket': 'a helpful supermarket employee',
      'Library': 'a knowledgeable librarian',
      'Gym': 'a friendly gym trainer',
      'Hospital': 'a caring nurse at the hospital reception',
      'Bank': 'a professional bank teller',
      'Post Office': 'a helpful post office clerk',
    }[scenario.location] || 'a helpful assistant';

    // 优先使用AI返回的goals，如果没有则使用预设模板作为后备
    let currentScenario;
    
    if (scenario.goals && scenario.goals.length > 0) {
      // 使用AI生成的goals（优先）
      currentScenario = {
        goals: scenario.goals,
        completion: scenario.completion_phrase || 'All done! Have a great day!',
        steps: `Guide the conversation naturally toward completing these goals: ${scenario.goals.join(', ')}`
      };
    } else {
      // 回退到预设模板（向后兼容）
      const scenarioGoals = {
        'Coffee Shop': {
          goals: ['Take order', 'Confirm preferences', 'Process payment'],
          completion: 'Your order is ready! Have a great day!',
          steps: 'Guide the user through: 1) Greeting and asking what they want, 2) Confirming size/customization, 3) Mentioning the price and payment method'
        },
        'Restaurant': {
          goals: ['Seat customer', 'Take order', 'Handle special requests'],
          completion: 'Your order will be right out! Enjoy your meal!',
          steps: 'Guide the user through: 1) Welcome and seating, 2) Menu recommendations and taking order, 3) Confirming special dietary needs or preferences'
        },
        'Airport': {
          goals: ['Check-in', 'Luggage handling', 'Gate information'],
          completion: 'You\'re all set! Have a safe flight!',
          steps: 'Guide the user through: 1) Checking booking details, 2) Luggage weight and tags, 3) Providing boarding pass and gate info'
        },
        'Hotel': {
          goals: ['Check-in', 'Room preferences', 'Hotel amenities'],
          completion: 'Your room is ready! Enjoy your stay!',
          steps: 'Guide the user through: 1) Verifying reservation, 2) Confirming room type and preferences, 3) Explaining hotel facilities and WiFi'
        },
        'Supermarket': {
          goals: ['Find items', 'Provide directions', 'Checkout assistance'],
          completion: 'Found everything you need! Have a nice day!',
          steps: 'Guide the user through: 1) Asking what they\'re looking for, 2) Directing them to aisles, 3) Offering help with checkout or bags'
        },
        'Library': {
          goals: ['Book search', 'Library card', 'Return information'],
          completion: 'All set! Happy reading!',
          steps: 'Guide the user through: 1) Finding the book they need, 2) Checking out with library card, 3) Explaining due dates and return process'
        },
        'Gym': {
          goals: ['Membership check', 'Equipment guidance', 'Workout plan'],
          completion: 'Great workout plan! Stay motivated!',
          steps: 'Guide the user through: 1) Checking membership status, 2) Showing equipment locations, 3) Suggesting workout routines based on their goals'
        },
        'Hospital': {
          goals: ['Check-in', 'Insurance verification', 'Department directions'],
          completion: 'You\'re all checked in! The doctor will see you soon!',
          steps: 'Guide the user through: 1) Patient information and reason for visit, 2) Verifying insurance, 3) Directing to the correct department'
        },
        'Bank': {
          goals: ['Account inquiry', 'Transaction processing', 'Documentation'],
          completion: 'Transaction complete! Is there anything else I can help you with?',
          steps: 'Guide the user through: 1) Verifying identity and account, 2) Processing transaction (deposit/withdrawal/transfer), 3) Providing receipts or confirmations'
        },
        'Post Office': {
          goals: ['Package details', 'Shipping options', 'Payment'],
          completion: 'Your package is on its way! Have a great day!',
          steps: 'Guide the user through: 1) Getting package information (destination, weight), 2) Offering shipping options (speed, tracking), 3) Processing payment'
        }
      };

      currentScenario = scenarioGoals[scenario.location as keyof typeof scenarioGoals] || {
        goals: ['Assist customer', 'Answer questions', 'Complete transaction'],
        completion: 'All done! Have a great day!',
        steps: 'Guide the conversation naturally toward completing the customer\'s needs'
      };
    }

    // 保存目标用于UI显示
    if (conversationGoals.length === 0) {
      setConversationGoals(currentScenario.goals);
    }

    const instruction = `You are ${npcRole}. 

SCENE: ${scenario.location} - ${scenario.situation}
CONTEXT: ${scenario.context}

YOUR ROLE:
- Stay in character as ${npcRole} throughout the conversation
- Respond naturally and concisely (2-3 sentences max)
- Use appropriate vocabulary for this setting
- Be helpful and friendly
- Speak at a normal conversational pace

USER LEVEL: ${userLevel}
- Beginner: Use simple words and short sentences
- Intermediate: Use everyday vocabulary with some idiomatic expressions
- Advanced: Use natural native expressions and varied vocabulary

CONVERSATION GOALS:
${currentScenario.steps}

IMPORTANT:
- Keep responses brief and natural (like real conversation)
- Don't over-explain unless asked
- React naturally to what the user says
- Actively guide the conversation toward completing the goals
- When all goals are accomplished, end with: "${currentScenario.completion}"
- This completion phrase signals the conversation objective is complete`;

    return instruction;
  };

  const { 
    isActive: geminiLiveActive, 
    connectionState: geminiLiveState,
    volume: liveVolume,
    startLiveSession, 
    stopLiveSession 
  } = useGeminiLive({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    systemInstruction: buildSystemInstruction(),
    voiceName: 'Kore', // 可以根据场景选择不同声音：Puck, Charon, Kore, Fenrir, Aoide
    onError: (err) => {
      console.error("Gemini Live Error:", err);
      setIsLiveActive(false);
    },
    onInterrupted: () => {
      console.log("AI was interrupted by user");
    },
    onTextReceived: (text) => {
      checkGoalCompletion(text);
    }
  });

  const handleToggleLive = () => {
    if (isLiveActive) {
      stopLiveSession();
      setIsLiveActive(false);
      setGoalProgress(0);
      setShowGoalComplete(false);
      conversationTextRef.current = '';
    } else {
      startLiveSession();
      setIsLiveActive(true);
      setGoalProgress(0);
      setShowGoalComplete(false);
      conversationTextRef.current = '';
    }
  };

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
  const typingMessageRef = useRef<HTMLDivElement | null>(null);

  // Initialize chat with AI's first line or load existing dialogue
  useEffect(() => {
    if (dialogueId) {
      // Load existing dialogue
      const scenarios = storage.getItem<Scenario[]>('speakSnapScenarios') || [];
      const currentScenario = scenarios.find((s: Scenario) => s.id === scenario.id);
      const existingDialogue = currentScenario?.dialogues?.find((d: any) => d.id === dialogueId);
      
      if (existingDialogue) {
        setMessages(existingDialogue.messages);
        // Reset last played message ID when loading existing dialogue
        // This prevents auto-playing old messages, only new ones will play
        const lastAiMessage = existingDialogue.messages
          .filter((msg: DialogueLine) => msg.speaker === 'ai')
          .slice(-1)[0];
        if (lastAiMessage) {
          lastPlayedMessageIdRef.current = lastAiMessage.id;
        }
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
    
    // Reset last played message ID for new dialogue
    lastPlayedMessageIdRef.current = null;
    
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

  // Disable browser native text selection toolbar on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleContextMenu = (e: MouseEvent | TouchEvent) => {
      // Prevent native context menu when text is selected in chat area
      const target = e.target as HTMLElement;
      if (target.closest('.message-text') || (chatContainerRef.current && chatContainerRef.current.contains(target))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent native text selection toolbar by handling touch events
    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.message-text') || (chatContainerRef.current && chatContainerRef.current.contains(target))) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          // Prevent default behavior that shows native toolbar
          e.preventDefault();
          // Blur any active element to prevent native toolbar
          if (document.activeElement && document.activeElement !== document.body) {
            (document.activeElement as HTMLElement).blur();
          }
        }
      }
    };

    // Prevent long press context menu
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.message-text') || (chatContainerRef.current && chatContainerRef.current.contains(target))) {
        // Allow selection but we'll prevent the toolbar in touchEnd
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

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

        // Capture rect immediately to avoid native toolbar offset issues
        const capturedRect = {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };

        // On mobile, delay menu display to allow selection to complete
        const delay = isMobile ? 300 : 0;
        
        selectionTimeoutRef.current = setTimeout(() => {
          // Re-check selection is still valid
          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.isCollapsed || 
              currentSelection.toString().trim() !== text) {
            return;
          }

          // Calculate menu position - use captured rect to avoid native toolbar issues
          const viewportWidth = window.innerWidth;
          
          // Position menu directly above selected text
          const menuX = capturedRect.left + capturedRect.width / 2;
          const menuY = capturedRect.top;

          // Clamp horizontal position to stay in viewport
          const clampedX = Math.min(Math.max(100, menuX), viewportWidth - 100);

          setSelectionMenu({
            x: clampedX,
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

  // 语音识别 Hook
  const {
    isRecording,
    isSupported: isVoiceSupported,
    startRecording,
    stopRecording,
    error: voiceError,
  } = useVoiceRecorder({
    onResult: (text, isFinal) => {
      if (isFinal) {
        // 最终结果：追加到输入框
        setInputValue((prev) => {
          const separator = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + separator + text;
        });
        // 清空临时文本
        setInterimText('');
      }
    },
    onInterimResult: (text) => {
      // 实时临时结果：显示在输入框中但不保存
      setInterimText(text);
    },
    onError: (error) => {
      console.error('Voice recognition error:', error);
      setInterimText('');
    },
    language: 'en-US',
    preventDuplicates: true,
  });

  const handleToggleAutoPlay = () => {
    const newState = !autoPlayAudio;
    setAutoPlayAudio(newState);
    autoPlayAudioRef.current = newState;
    
    // Show toast feedback
    setShowAudioToast(true);
    setTimeout(() => setShowAudioToast(false), 2000);
  };

  // Sync autoPlayAudio ref when state changes
  useEffect(() => {
    const wasEnabled = autoPlayAudioRef.current;
    autoPlayAudioRef.current = autoPlayAudio;
    
    // When auto-play is enabled, reset last played message ID
    // so the current latest AI message can be played if it exists
    if (!wasEnabled && autoPlayAudio) {
      lastPlayedMessageIdRef.current = null;
    }
  }, [autoPlayAudio]);

  // Auto-play AI messages when enabled
  useEffect(() => {
    if (!autoPlayAudioRef.current) return;

    // Find the last AI message that hasn't been played
    const lastAiMessage = messages
      .filter(msg => msg.speaker === 'ai')
      .slice(-1)[0];

    if (!lastAiMessage || lastAiMessage.id === lastPlayedMessageIdRef.current) {
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Play the new AI message with a slight delay for better UX
    const timeoutId = setTimeout(() => {
      if (autoPlayAudioRef.current && lastAiMessage.text) {
        const utterance = new SpeechSynthesisUtterance(lastAiMessage.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => {
          lastPlayedMessageIdRef.current = lastAiMessage.id;
        };
        utterance.onerror = () => {
          lastPlayedMessageIdRef.current = lastAiMessage.id;
        };
        window.speechSynthesis.speak(utterance);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [messages, autoPlayAudio]);

  const handleVoiceInput = () => {
    if (!isVoiceSupported) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
      // 优化：只发送最近10轮对话（20条消息），大幅减少token消耗
      const recentMessages = messages.slice(-20);
      const history = recentMessages.map((m) => ({
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

      // Add AI response with typing animation
      if (result.next_response) {
        const aiMessageId = (Date.now() + 1).toString();
        updatedMessages = [
          ...updatedMessages,
          {
            id: aiMessageId,
            speaker: 'ai' as const,
            text: result.next_response,
          },
        ];
        
        // Update state first
        setMessages(updatedMessages);
        
        // Then trigger typing animation for better UX
        typeMessage(aiMessageId, result.next_response);
        
        // Check goal completion in text chat mode
        checkGoalCompletion(result.next_response);
      } else {
        // No AI response, just update messages
        setMessages(updatedMessages);
      }

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
      
      // 更友好的错误提示
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
      
      if (isNetworkError) {
        alert('⚠️ Network connection issue. Please check your internet and try again.');
      } else {
        alert('❌ Failed to get AI response. Please try again.\n\nIf the problem persists, try refreshing the page.');
      }
      
      // 移除失败的用户消息，让用户可以重新发送
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
      // 恢复输入框内容
      setInputValue(textToSend);
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

      const cards = storage.getItem<any[]>('speakSnapFlashcards') || [];
      storage.setItem('speakSnapFlashcards', [newCard, ...cards]);

      // Log for debugging
      console.log('✅ Flashcard saved:', newCard);
      console.log('Total flashcards:', cards.length + 1);

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
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-start p-4 pt-6 bg-gradient-to-b from-primary-50 via-primary-50/90 to-transparent pointer-events-none">
        {/* Left side: Scenario Image + Auto button */}
        <div className="flex items-center gap-3">
          {/* Scenario Image - Small, top left */}
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md bg-white ring-2 ring-white transform transition-transform duration-300 hover:scale-105 pointer-events-auto">
            {scenario.image_url ? (
              <img
                src={scenario.image_url}
                alt={scenario.location}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                <MapPin size={16} />
              </div>
            )}
          </div>
          
          {/* Auto-play Audio Toggle - Enhanced UI */}
          <button
          onClick={handleToggleAutoPlay}
          className={`relative group h-9 rounded-full flex items-center gap-2 transition-all duration-300 pointer-events-auto active:scale-95 touch-manipulation overflow-hidden ${
            autoPlayAudio 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 pr-3 pl-2.5' 
              : 'bg-white/95 text-gray-500 hover:text-gray-700 hover:bg-white shadow-md hover:shadow-lg pr-3 pl-2.5 border border-gray-200/50'
          }`}
          aria-label={autoPlayAudio ? 'Disable auto audio' : 'Enable auto audio'}
        >
          {/* Background pulse effect when ON */}
          {autoPlayAudio && (
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          )}
          
          {/* Icon with animation */}
          <div className="relative z-10 flex items-center justify-center w-5 h-5">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transition-transform duration-300"
            >
              <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
              {autoPlayAudio && (
                <>
                  <path d="M16 9a5 5 0 0 1 0 6" className="animate-pulse"></path>
                  <path d="M19 7a9 9 0 0 1 0 10" className="animate-pulse" style={{ animationDelay: '0.15s' }}></path>
                </>
              )}
              {!autoPlayAudio && <path d="M23 9l-6 6m0-6l6 6" strokeWidth="2"></path>}
            </svg>
          </div>
          
          {/* Text label */}
          <span className={`relative z-10 text-xs font-bold tracking-wide transition-all duration-300 ${
            autoPlayAudio ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
          }`}>
            {autoPlayAudio ? 'ON' : 'OFF'}
          </span>
        </button>
        </div>

        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-float border border-white/50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all pointer-events-auto active:scale-95 hover:bg-white touch-manipulation"
          aria-label="Close dialogue"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>
      
      {/* Toast notification for auto-play toggle */}
      {showAudioToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
          <div className={`px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2 ${
            autoPlayAudio 
              ? 'bg-emerald-600 text-white' 
              : 'bg-gray-800 text-white'
          }`}>
            <div className="w-5 h-5 flex items-center justify-center">
              {autoPlayAudio ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              )}
            </div>
            <span className="text-sm font-semibold whitespace-nowrap">
              {autoPlayAudio ? 'Auto-play enabled' : 'Auto-play disabled'}
            </span>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-0 pb-60 space-y-6 bg-transparent relative"
      >
        <div className="h-14 w-full" />

        {/* Scenario Intro */}
        <div className="flex flex-col items-center justify-center w-full mb-8 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="text-center px-4 max-w-[85%]">
            <h3 className="text-primary-900 font-bold text-lg tracking-tight mb-1">
              {scenario.location}
            </h3>
            <p className="text-gray-500 text-[13px] font-medium leading-relaxed">
              {scenario.situation}
            </p>
          </div>
        </div>

        {/* Conversation Goals - Sticky position, sticks to top when scrolling */}
        {conversationGoals.length > 0 && (
          <div className="sticky top-20 z-30 mb-6 flex justify-center w-full animate-in fade-in slide-in-from-top duration-500">
            <div className="w-full max-w-sm bg-white backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-200/50">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Conversation Goals
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {Math.round(goalProgress)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${goalProgress}%` }}
                ></div>
              </div>

              {/* Goals List */}
              <div className="space-y-2">
                {conversationGoals.map((goal, idx) => {
                  const isComplete = goalProgress >= ((idx + 1) / conversationGoals.length) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        isComplete 
                          ? 'bg-green-500' 
                          : 'bg-gray-200'
                      }`}>
                        {isComplete && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span className={`transition-colors duration-300 ${
                        isComplete ? 'text-gray-700 font-medium' : 'text-gray-500'
                      }`}>
                        {goal}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg: DialogueLine) => (
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
                {msg.feedback && (() => {
                  // Only show feedback if there are actionable improvements
                  const hasGrammarIssues = msg.feedback.grammar && msg.feedback.grammar.trim() !== '';
                  const hasNativeExpression = msg.feedback.native_expression && msg.feedback.native_expression.trim() !== '';
                  const hasLowScore = msg.feedback.score < 95;
                  const shouldShowFeedback = hasGrammarIssues || hasNativeExpression || hasLowScore;
                  
                  if (!shouldShowFeedback) return null;
                  
                  return (
                    <div className="mt-2 mr-1 max-w-full bg-white/60 border border-black/5 rounded-xl p-3 text-xs backdrop-blur-sm animate-in fade-in slide-in-from-top space-y-2">
                      {/* Score and Title */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              msg.feedback.score > 80 ? 'bg-green-500' : 'bg-orange-400'
                            }`}
                          />
                          <span className="font-semibold text-gray-800">AI Feedback</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-500">{msg.feedback.score}/100</span>
                      </div>
                      
                      {/* Main Comment */}
                      <p className="text-gray-700 leading-relaxed">{msg.feedback.comment}</p>
                      
                      {/* Grammar Analysis */}
                      {hasGrammarIssues && (
                        <div className="pt-2 border-t border-gray-200/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            <span className="font-semibold text-gray-700 text-[10px] uppercase tracking-wide">Grammar</span>
                          </div>
                          <p className="text-gray-600">{msg.feedback.grammar}</p>
                        </div>
                      )}
                      
                      {/* Native Expression */}
                      {hasNativeExpression && (
                        <div className="pt-2 border-t border-gray-200/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px]">💬</span>
                            <span className="font-semibold text-gray-700 text-[10px] uppercase tracking-wide">Native Way</span>
                          </div>
                          <p className="text-gray-600 italic">"{msg.feedback.native_expression}"</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-start max-w-[90%]">
                <div 
                  ref={typingMessageId === msg.id ? typingMessageRef : null}
                  className="message-text text-[#191D20] text-[15px] font-medium leading-relaxed px-1 selection:bg-blue-200 selection:text-black"
                >
                  {/* 显示打字动画或完整文本 */}
                  {typingMessageId === msg.id ? displayedText : msg.text}
                  {/* 打字光标 */}
                  {typingMessageId === msg.id && (
                    <span className="inline-block w-[2px] h-[1.2em] bg-blue-500 ml-0.5 animate-pulse" />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 px-1 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="bg-gradient-to-r from-apple-blue to-apple-blue-light bg-clip-text text-transparent font-medium">
                Thinking
              </span>
              <span className="inline-flex items-center gap-0 leading-none text-apple-blue">
                <span className="animate-typing-dot-1">.</span>
                <span className="animate-typing-dot-2">.</span>
                <span className="animate-typing-dot-3">.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Selection Menu - Notion Style */}
      {selectionMenu && !selectionResult && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionMenu.x}px`,
            top: `${Math.max(selectionMenu.y - 10, 60)}px`,
            transform: 'translate(-50%, -100%)',
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
                  className="selection-toolbar-btn group p-1 hover:bg-gray-100 active:bg-gray-200 transition-all rounded-full touch-manipulation min-h-0 min-w-0"
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
                    navigator.clipboard.writeText(selectionMenu.text);
                    // Visual feedback
                    const btn = e.currentTarget;
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-green-600"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    setTimeout(() => {
                      btn.innerHTML = originalHTML;
                    }, 1000);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="selection-toolbar-btn group p-1 hover:bg-gray-100 active:bg-gray-200 transition-all rounded-full touch-manipulation min-h-0 min-w-0"
                  title="Copy text"
                  aria-label="Copy text"
                >
                  <Copy size={18} className="text-gray-700 group-hover:text-gray-900 transition-colors" />
                </button>
                
                <div className="h-4 w-px bg-gray-200"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranslate();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="selection-toolbar-btn group p-1 hover:bg-blue-50 active:bg-blue-100 transition-all rounded-full touch-manipulation min-h-0 min-w-0"
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
                  className="selection-toolbar-btn group p-1 hover:bg-purple-50 active:bg-purple-100 transition-all rounded-full touch-manipulation min-h-0 min-w-0"
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
                  className="selection-toolbar-btn group p-1 hover:bg-green-50 active:bg-green-100 transition-all rounded-full touch-manipulation min-h-0 min-w-0"
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

      {/* Goal Complete Notification */}
      {showGoalComplete && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-500">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-green-500/30 blur-2xl rounded-3xl"></div>
            
            {/* Main card */}
            <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4 pr-5 shadow-2xl border border-green-400/50 backdrop-blur-xl min-w-[280px]">
              {/* Close button */}
              <button
                onClick={() => setShowGoalComplete(false)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X size={14} strokeWidth={2.5} />
              </button>

              {/* Success icon */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>

                <div className="flex-1 pt-1">
                  <h4 className="font-bold text-base mb-1">Goal Achieved!</h4>
                  <p className="text-sm text-white/90 leading-relaxed mb-3">
                    {isLiveActive 
                      ? 'Conversation completed successfully. You can end the call now.'
                      : 'Conversation completed successfully!'}
                  </p>

                  {/* Action button */}
                  {isLiveActive && (
                    <button
                      onClick={() => {
                        stopLiveSession();
                        setIsLiveActive(false);
                        setShowGoalComplete(false);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-semibold py-2.5 px-4 rounded-xl transition-all backdrop-blur-sm border border-white/30 flex items-center justify-center gap-2"
                    >
                      <PhoneOff size={16} strokeWidth={2.5} />
                      <span>End Call</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gemini Live Call Button - Floating Bottom Right */}
      <div className="absolute bottom-36 right-6 z-40">
        <button
          onClick={handleToggleLive}
          disabled={geminiLiveState === 'connecting'}
          className={`relative group w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto active:scale-90 touch-manipulation shadow-2xl ${
            isLiveActive 
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white ring-4 ring-red-100' 
              : geminiLiveState === 'connecting'
              ? 'bg-gray-300 text-gray-500 cursor-wait'
              : 'bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200/50'
          }`}
          aria-label={isLiveActive ? 'End Live Call' : 'Start Live Call'}
        >
          {/* Pulsing effect when active */}
          {isLiveActive && (
            <div 
              className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-30"
              style={{ 
                transform: `scale(${1 + liveVolume * 0.3})`,
                transition: 'transform 0.1s ease-out'
              }}
            ></div>
          )}
          
          {/* Volume-responsive outer ring */}
          {isLiveActive && liveVolume > 0.1 && (
            <div 
              className="absolute inset-0 rounded-full border-4 border-white/50"
              style={{ 
                transform: `scale(${1 + liveVolume * 0.5})`,
                transition: 'transform 0.05s ease-out'
              }}
            ></div>
          )}
          
          <div className="relative z-10 flex items-center justify-center">
            {geminiLiveState === 'connecting' ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isLiveActive ? (
              <PhoneOff size={24} strokeWidth={2.5} />
            ) : (
              <Phone size={24} strokeWidth={2.5} />
            )}
          </div>
          
          {/* Status Indicator */}
          {geminiLiveState === 'connecting' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
          )}
          {isLiveActive && geminiLiveState === 'connected' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </button>
      </div>

      {/* Bottom Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-3 pb-6 border-t border-black/5 z-40 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {/* Suggestions */}
        {showSuggestions && hints.length > 0 && (
          <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom fade-in">
            <Lightbulb size={12} className="text-yellow-600 fill-current shrink-0" />
            {hints.map((hint, idx) => (
              <button
                key={idx}
                onClick={() => setInputValue(hint)}
                className="suggestion-btn h-[22px] px-2.5 rounded-[6px] bg-[#F0F4F9] text-[#1F1F1F] text-[10px] font-medium hover:bg-[#E2E7EB] transition-colors whitespace-nowrap shrink-0"
              >
                {hint}
              </button>
            ))}
            <button
              onClick={() => setShowSuggestions(false)}
              className="suggestion-btn p-0.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors shrink-0 ml-auto"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className={`w-full bg-white rounded-xl border transition-all flex items-center p-1.5 pl-4 gap-2 ${
          isRecording 
            ? 'border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]' 
            : 'border-gray-200 focus-within:border-gray-300 focus-within:shadow-sm'
        }`}>
          <div className="flex-1 relative min-w-0 flex items-center h-full py-1">
            {/* 输入框 */}
            <input
              ref={textareaRef}
              value={inputValue + interimText}
              onChange={(e) => {
                // 只更新确认的文本部分，不更新临时识别文本
                const newValue = e.target.value;
                if (interimText && newValue.endsWith(interimText)) {
                  setInputValue(newValue.slice(0, -interimText.length));
                } else {
                  setInputValue(newValue);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={(inputValue || interimText) ? '' : (isRecording ? 'Listening...' : 'Ask the tutor...')}
              className={`w-full bg-transparent text-[16px] outline-none min-w-0 leading-normal ${
                interimText ? 'text-transparent caret-primary-900' : 'text-primary-900 placeholder:text-gray-400'
              }`}
            />
            {/* 可见的文本叠加层 - 带样式区分，防止溢出 */}
            {interimText && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] leading-normal w-full pr-2 overflow-hidden">
                <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="text-primary-900">{inputValue}</span>
                  {inputValue && <span className="text-primary-900"> </span>}
                  <span className="text-gray-400 italic transition-opacity duration-200">{interimText}</span>
                </div>
              </div>
            )}
          </div>

          {/* 字符计数提示（长文本时显示） */}
          {inputValue.length > 100 && (
            <span className={`text-[10px] font-medium transition-colors ${
              inputValue.length > 200 ? 'text-orange-500' : 'text-gray-400'
            }`}>
              {inputValue.length}
            </span>
          )}

          <button
            onClick={handleVoiceInput}
            disabled={!isVoiceSupported}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30 animate-pulse'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95'
            }`}
          >
            <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
          </button>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isProcessing}
            className={`
              flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all
              ${
                isProcessing
                  ? 'bg-gray-200 text-gray-500 cursor-wait'
                  : inputValue.trim()
                  ? 'bg-black text-white hover:bg-gray-800 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
