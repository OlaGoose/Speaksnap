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
  onTurnComplete?: () => void; // When a turn is complete
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
      const processor = inputCtx.createScriptProcessor(512, 1, 1);
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
            setIsActive(true);
            setConnectionState('connected');
            
            // Start processing audio only when connected
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              // Normalize roughly for visual effect
              setVolume(Math.min(rms * 5, 1)); 

              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            if (!serverContent) return;

            // Handle User Input Transcription
            // Note: SDK types may not include all fields, use safe access
            const userTranscription = (serverContent as any).userTranscription;
            if (userTranscription?.parts) {
              for (const part of userTranscription.parts) {
                if (part.text) {
                  console.log("User transcription:", part.text);
                  onInputTranscription?.(part.text);
                }
              }
            }

            // Handle Model Turn (Output Audio + Transcription)
            const modelTurn = serverContent.modelTurn;
            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                // Handle Text (Output Transcription or General Text)
                if (part.text) {
                  console.log("Model text:", part.text);
                  onTextReceived?.(part.text);
                  onOutputTranscription?.(part.text);
                }

                // Handle Audio Output
                if (part.inlineData?.data && outputAudioContextRef.current && outputNodeRef.current) {
                  const base64Audio = part.inlineData.data;
                  const ctx = outputAudioContextRef.current;
                  
                  // Ensure playback time is continuous
                  nextStartTimeRef.current = Math.max(
                    nextStartTimeRef.current,
                    ctx.currentTime
                  );

                  const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                  );

                  const bufferSource = ctx.createBufferSource();
                  bufferSource.buffer = audioBuffer;
                  bufferSource.connect(outputNodeRef.current);
                  
                  bufferSource.onended = () => {
                    audioSourcesRef.current.delete(bufferSource);
                  };

                  bufferSource.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  audioSourcesRef.current.add(bufferSource);
                }
              }
            }

            // Handle Turn Completion
            if (serverContent.turnComplete) {
              console.log("Turn complete");
              onTurnComplete?.();
            }

            // Handle Interruptions (Critical: Must stop client audio immediately)
            if (serverContent.interrupted) {
              console.log("Model interrupted - stopping audio playback");
              stopAudio();
              onInterrupted?.();
            }
          },
          onclose: () => {
            console.log("Session closed");
            stopLiveSession();
          },
          onerror: (err) => {
            console.error("Session error:", err);
            onError?.("Connection lost or error occurred.");
            stopLiveSession();
          }
        },
        config: {
          // Include TEXT modality when transcription is enabled
          responseModalities: enableTranscription 
            ? [Modality.AUDIO, Modality.TEXT] 
            : [Modality.AUDIO],
          
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
