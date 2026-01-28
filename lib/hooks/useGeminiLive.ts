"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';

interface UseGeminiLiveOptions {
  apiKey: string;
  systemInstruction?: string;
  voiceName?: string;
  tools?: any[];
  onError?: (error: string) => void;
  onInterrupted?: () => void;
  onTextReceived?: (text: string, role: 'user' | 'model') => void;
  onFunctionCall?: (functionName: string, args: any) => void;
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
 */
export function useGeminiLive({
  apiKey,
  systemInstruction = "You are a helpful, concise AI assistant. You answer briefly and clearly.",
  voiceName = 'Kore',
  tools = [],
  onError,
  onInterrupted,
  onTextReceived,
  onFunctionCall,
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

      // 5. Setup Processor for Streaming
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
            // Process all parts from model response
            const parts = message.serverContent?.modelTurn?.parts || [];
            
            for (const part of parts) {
              // Handle Audio Output
              if (part.inlineData?.data && outputAudioContextRef.current && outputNodeRef.current) {
                const ctx = outputAudioContextRef.current;
                
                // Ensure playback time is continuous
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  ctx.currentTime
                );

                const audioBuffer = await decodeAudioData(
                  decode(part.inlineData.data),
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
              
              // Handle Text Output
              if (part.text) {
                console.log("Model text:", part.text);
                onTextReceived?.(part.text, 'model');
              }
              
              // Handle Function Call
              if (part.functionCall && part.functionCall.name) {
                console.log("Function call:", part.functionCall.name, part.functionCall.args);
                onFunctionCall?.(part.functionCall.name, part.functionCall.args || {});
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              console.log("Model interrupted");
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
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          systemInstruction,
          tools: tools.length > 0 ? tools : undefined,
        },
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
  }, [isActive, connectionState, apiKey, systemInstruction, voiceName, onError, onInterrupted, stopAudio, stopLiveSession]);

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
