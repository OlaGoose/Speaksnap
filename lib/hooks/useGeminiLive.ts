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
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
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
                    voice_name: "Aoide", 
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
          console.log("Gemini Live message:", response);
          
          // 处理服务端内容
          if (response.serverContent) {
            const serverContent = response.serverContent;
            
            // 处理模型回合
            if (serverContent.modelTurn?.parts) {
              const parts = serverContent.modelTurn.parts;
              console.log("Gemini Live: Processing parts", parts.length);
              for (const part of parts) {
                if (part.inlineData?.data) {
                  console.log("Gemini Live: Audio data received, length:", part.inlineData.data.length);
                  onAudioData?.(part.inlineData.data);
                }
                if (part.text) {
                  console.log("Gemini Live: Text data received:", part.text);
                  onTextData?.(part.text);
                }
              }
            }

            // 处理直接包含的音频数据（某些响应格式）
            if (serverContent.inlineData?.data) {
              console.log("Gemini Live: Direct audio data received");
              onAudioData?.(serverContent.inlineData.data);
            }

            // 处理打断 (Interruption)
            if (serverContent.interrupted) {
              console.log("Gemini Live: Interrupted by user");
            }

            // 处理回合结束
            if (serverContent.turnComplete) {
              console.log("Gemini Live: Turn complete");
            }
          }
          
          // 处理错误响应
          if (response.error) {
            console.error("Gemini Live error:", response.error);
            onError?.(response.error.message || "Gemini Live API error");
          }
        } catch (err) {
          console.error("Error parsing Gemini message:", err, event.data);
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // 使用 ScriptProcessorNode (虽然已废弃但兼容性好，且在简单场景下足够)
      // 注意：Gemini 期望 16kHz L16 PCM
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // 转换为 16-bit PCM (Little Endian)
          const pcmBuffer = new ArrayBuffer(inputData.length * 2);
          const pcmView = new DataView(pcmBuffer);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmView.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          
          // 转为 Base64 并通过 realtime_input 发送
          const uint8Array = new Uint8Array(pcmBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);
          
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
