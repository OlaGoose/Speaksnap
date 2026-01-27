"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseGeminiLiveOptions {
  apiKey: string;
  onAudioData?: (base64Audio: string) => void;
  onTextData?: (text: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: "connected" | "disconnected" | "connecting") => void;
}

/**
 * Gemini Multimodal Live API Hook
 * 实现低延迟实时语音交互
 */
export function useGeminiLive({
  apiKey,
  onAudioData,
  onTextData,
  onError,
  onStateChange,
}: UseGeminiLiveOptions) {
  const [isActive, setIsActive] = useState(false);
  const [connectionState, setConnectionState] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setConnectionState("disconnected");
    onStateChange?.("disconnected");
    setIsActive(false);
  }, [onStateChange]);

  const startLiveSession = useCallback(async () => {
    if (!apiKey) {
      onError?.("Gemini API Key is missing");
      return;
    }

    try {
      setConnectionState("connecting");
      onStateChange?.("connecting");
      setIsActive(true);

      // 1. 初始化 WebSocket
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("connected");
        onStateChange?.("connected");
        
        // 发送初始配置
        const setup = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Aoide", // 推荐的语音
                  }
                }
              }
            }
          }
        };
        ws.send(JSON.stringify(setup));
      };

      ws.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);
          
          if (response.serverContent?.modelTurn?.parts) {
            const parts = response.serverContent.modelTurn.parts;
            for (const part of parts) {
              if (part.inlineData?.data) {
                onAudioData?.(part.inlineData.data);
              }
              if (part.text) {
                onTextData?.(part.text);
              }
            }
          }
        } catch (err) {
          console.error("Error parsing Gemini message:", err);
        }
      };

      ws.onerror = (ev) => {
        console.error("WebSocket error:", ev);
        onError?.("WebSocket connection failed");
        cleanup();
      };

      ws.onclose = () => {
        cleanup();
      };

      // 2. 初始化音频采集
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // 转换为 16-bit PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          
          // 转为 Base64 并发送
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          ws.send(JSON.stringify({
            realtime_input: {
              media_chunks: [{
                data: base64,
                mime_type: "audio/pcm;rate=16000"
              }]
            }
          }));
        }
      };

    } catch (err: any) {
      console.error("Failed to start Gemini Live:", err);
      onError?.(err.message || "Failed to access microphone");
      cleanup();
    }
  }, [apiKey, onAudioData, onTextData, onError, onStateChange, cleanup]);

  const stopLiveSession = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isActive,
    connectionState,
    startLiveSession,
    stopLiveSession,
  };
}
