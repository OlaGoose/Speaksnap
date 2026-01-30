"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';

interface UseGeminiLiveOptions {
  apiKey: string;
  systemInstruction?: string;
  voiceName?: string;
  languageCode?: string; // e.g., 'en-US', 'zh-CN'
  enableTranscription?: boolean; // Enable audio transcription
  enableContextCompression?: boolean; // Enable context compression for long sessions
  onError?: (error: string) => void;
  onInterrupted?: () => void;
  onTextReceived?: (text: string) => void; // For general text output
  onInputTranscription?: (text: string) => void; // User's speech transcription
  onOutputTranscription?: (text: string) => void; // Model's speech transcription
  onUserTurnComplete?: (userText: string) => void; // User finished speaking (emit user bubble when AI starts)
  onTurnComplete?: (userText: string, aiText: string) => void; // AI finished (emit AI bubble)
}

interface UseGeminiLiveReturn {
  isActive: boolean;
  connectionState: 'connected' | 'disconnected' | 'connecting';
  volume: number;
  startLiveSession: () => Promise<void>;
  stopLiveSession: () => void;
}

/**
 * Gemini Multimodal Live API Hook
 * 使用官方 @google/genai SDK 实现低延迟实时语音交互
 * 
 * 最佳实践：
 * - 使用 20-40ms 音频块（512 采样 @16kHz ≈ 32ms）
 * - 启用音频转写以获取实时文本
 * - 为长会话启用上下文压缩
 * - 指定语言代码以提高性能
 */
export function useGeminiLive({
  apiKey,
  systemInstruction = "You are a helpful, concise AI assistant. You answer briefly and clearly.",
  voiceName = 'Kore',
  languageCode = 'en-US',
  enableTranscription = false,
  enableContextCompression = false,
  onError,
  onInterrupted,
  onTextReceived,
  onInputTranscription,
  onOutputTranscription,
  onUserTurnComplete,
  onTurnComplete,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [isActive, setIsActive] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [volume, setVolume] = useState(0);

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // State for audio playback queue
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const closeSessionRef = useRef<(() => void) | null>(null);
  const sessionOpenRef = useRef(false);
  const currentInputTranscriptRef = useRef('');
  const currentOutputTranscriptRef = useRef('');
  const userFlushedThisTurnRef = useRef(false);

  // Helper to stop all audio
  const stopAudio = useCallback(() => {
    // Stop all currently playing sources
    audioSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const stopLiveSession = useCallback(() => {
    console.log("Disconnecting...");
    sessionOpenRef.current = false;
    currentInputTranscriptRef.current = '';
    currentOutputTranscriptRef.current = '';
    userFlushedThisTurnRef.current = false;

    // Close the Live API session
    if (closeSessionRef.current) {
      closeSessionRef.current();
      closeSessionRef.current = null;
    }
    sessionPromiseRef.current = null;

    // Stop processing input
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    
    // Close Audio Contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    stopAudio();
    setIsActive(false);
    setConnectionState('disconnected');
    setVolume(0);
  }, [stopAudio]);

  const startLiveSession = useCallback(async () => {
    if (isActive || connectionState === 'connecting') return;
    
    if (!apiKey) {
      onError?.("Gemini API Key is missing");
      return;
    }

    setConnectionState('connecting');

    try {
      // 1. Initialize Audio Contexts
      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const inputCtx = new InputContextClass({ sampleRate: 16000 });
      const outputCtx = new InputContextClass({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // 2. Setup Output Node
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      // 3. Setup Input (Microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      inputSourceRef.current = source;

      // 4. Setup Visualizer (Analyser)
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 5. Setup Processor for Streaming (Best Practice: 20-40ms chunks)
      // 512 samples at 16kHz ≈ 32ms, optimal for low latency
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(inputCtx.destination); // Required for script processor to run

      // 6. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey });
      
      // 7. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            sessionOpenRef.current = true;
            setIsActive(true);
            setConnectionState('connected');
            
            processor.onaudioprocess = (e) => {
              if (!sessionOpenRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.min(Math.sqrt(sum / inputData.length) * 5, 1));
              sessionPromise.then((session) => {
                if (!sessionOpenRef.current) return;
                try {
                  session.sendRealtimeInput({ media: pcmBlob });
                } catch (_) {}
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            if (!serverContent) return;

            const sc = serverContent as {
              inputTranscription?: { text?: string };
              outputTranscription?: { text?: string };
              turnComplete?: boolean;
              interrupted?: boolean;
              modelTurn?: { parts?: Array<{ text?: string; inlineData?: { data?: string } }> };
            };

            // 1. User bubble: when AI first outputs (user has “finished” from our perspective)
            const hasAiOutput = !!(sc.outputTranscription?.text || sc.modelTurn?.parts?.length);
            if (hasAiOutput && !userFlushedThisTurnRef.current && currentInputTranscriptRef.current) {
              onUserTurnComplete?.(currentInputTranscriptRef.current);
              currentInputTranscriptRef.current = '';
              userFlushedThisTurnRef.current = true;
            }

            // 2. Transcription (accumulate and stream UI)
            if (sc.inputTranscription?.text) {
              currentInputTranscriptRef.current += sc.inputTranscription.text;
              if (enableTranscription) console.log('[Live 用户]', currentInputTranscriptRef.current);
              onInputTranscription?.(currentInputTranscriptRef.current);
            }
            if (sc.outputTranscription?.text) {
              currentOutputTranscriptRef.current += sc.outputTranscription.text;
              if (enableTranscription) console.log('[Live AI]', currentOutputTranscriptRef.current);
              onOutputTranscription?.(currentOutputTranscriptRef.current);
              onTextReceived?.(sc.outputTranscription.text);
            }
            if (sc.turnComplete) {
              const userText = currentInputTranscriptRef.current;
              const aiText = currentOutputTranscriptRef.current;
              if (!userFlushedThisTurnRef.current && userText) onUserTurnComplete?.(userText);
              currentInputTranscriptRef.current = '';
              currentOutputTranscriptRef.current = '';
              userFlushedThisTurnRef.current = false;
              onTurnComplete?.(userText, aiText);
            }
            if (sc.interrupted) {
              currentOutputTranscriptRef.current = '';
              userFlushedThisTurnRef.current = false;
              stopAudio();
              onInterrupted?.();
            }

            // 2. Audio output (modelTurn.parts[].inlineData)
            const modelTurn = sc.modelTurn;
            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                if (!part.inlineData?.data || !outputAudioContextRef.current || !outputNodeRef.current) continue;
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(
                  decode(part.inlineData.data),
                  ctx,
                  24000,
                  1
                );
                const bufferSource = ctx.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.connect(outputNodeRef.current);
                bufferSource.onended = () => audioSourcesRef.current.delete(bufferSource);
                bufferSource.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(bufferSource);
              }
            }
          },
          onclose: () => {
            console.log("Session closed");
            sessionOpenRef.current = false;
            stopLiveSession();
          },
          onerror: (err) => {
            console.error("Session error:", err);
            sessionOpenRef.current = false;
            onError?.("Connection lost or error occurred.");
            stopLiveSession();
          }
        },
        config: {
          // live 方式：仅 AUDIO，转写由 input/outputAudioTranscription 提供
          responseModalities: [Modality.AUDIO],
          
          // Speech configuration
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          
          // System instruction
          systemInstruction,
          
          // Enable audio transcription for both input and output
          ...(enableTranscription && {
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          }),
          
          // Additional config options (may not be in SDK types yet)
          ...(languageCode && { languageCode }),
          ...(enableContextCompression && {
            contextWindowCompressionConfig: {
              enabled: true,
            },
          }),
        } as any,
      });

      sessionPromiseRef.current = sessionPromise;

      // Expose close method
      closeSessionRef.current = () => {
        sessionPromise.then(session => session.close());
      };

    } catch (err: any) {
      console.error("Failed to connect:", err);
      onError?.(err.message || "Failed to access microphone or connect.");
      setConnectionState('disconnected');
      stopLiveSession();
    }
  }, [
    isActive, 
    connectionState, 
    apiKey, 
    systemInstruction, 
    voiceName, 
    languageCode,
    enableTranscription,
    enableContextCompression,
    onError, 
    onInterrupted, 
    onInputTranscription,
    onOutputTranscription,
    onUserTurnComplete,
    onTurnComplete,
    stopAudio, 
    stopLiveSession
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, [stopLiveSession]);

  return {
    isActive,
    connectionState,
    volume,
    startLiveSession,
    stopLiveSession,
  };
}
