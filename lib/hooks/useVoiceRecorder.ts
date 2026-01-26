"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceRecorderOptions {
  /** 最终确认的文本回调（用户停顿后确认的结果） */
  onResult?: (text: string, isFinal: boolean) => void;
  /** 实时临时结果回调（正在识别中的文本，用于实时显示） */
  onInterimResult?: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  /** 是否自动去重（防止重复添加相同文本） */
  preventDuplicates?: boolean;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

/**
 * 语音转文字 Hook - 针对英语学习优化
 * 
 * 工作流程：
 * 1. 实时显示临时识别结果（灰色/斜体）- onInterimResult
 * 2. 用户停顿后，临时结果变为最终确认结果 - onResult(text, true)
 * 3. 继续识别新的临时结果，追加到已确认的文本后
 * 
 * 这种方式提供最佳的实时反馈体验
 */
export function useVoiceRecorder({
  onResult,
  onInterimResult,
  onError,
  language = "en-US",
  preventDuplicates = true,
}: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastFinalResultRef = useRef<string>("");
  const accumulatedFinalTextRef = useRef<string>("");
  const isStoppingRef = useRef<boolean>(false);

  const isSupported = typeof window !== "undefined" && 
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  /**
   * 清理识别对象，确保完全停止
   */
  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // 移除所有事件监听器，防止在清理过程中触发事件
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        
        // 尝试停止识别
        if (recognitionRef.current.state === "recording" || recognitionRef.current.state === "starting") {
          recognitionRef.current.stop();
        }
      } catch (err) {
        // 忽略清理过程中的错误
        console.warn("Error during recognition cleanup:", err);
      } finally {
        recognitionRef.current = null;
      }
    }
    isStoppingRef.current = false;
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      const errorMsg = "Speech recognition not supported in this browser";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // 如果正在录音，先停止
    if (recognitionRef.current) {
      const currentState = recognitionRef.current.state;
      if (currentState === "recording" || currentState === "starting") {
        cleanupRecognition();
        setIsRecording(false);
        return;
      }
    }

    // 清理旧的识别对象
    cleanupRecognition();

    setError(null);
    setIsRecording(true);
    lastFinalResultRef.current = "";
    accumulatedFinalTextRef.current = "";
    isStoppingRef.current = false;

    try {
      // 使用 Web Speech API 进行实时语音识别
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true; // ⭐ 启用临时结果，实现实时反馈
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("✅ Speech recognition started");
        isStoppingRef.current = false;
      };

      recognition.onresult = (event: any) => {
        // 如果正在停止，忽略结果
        if (isStoppingRef.current) {
          return;
        }

        let interimTranscript = "";
        let finalTranscript = "";

        // ⭐ 只处理新的识别结果（从 resultIndex 开始），避免重复处理历史结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            // 最终确认的结果
            finalTranscript += transcript;
          } else {
            // 临时结果（正在识别中）
            interimTranscript += transcript;
          }
        }

        // 处理临时结果 - 实时显示
        if (interimTranscript) {
          console.log("💬 Interim:", interimTranscript);
          onInterimResult?.(interimTranscript);
        }

        // 处理最终结果 - 确认并追加
        if (finalTranscript) {
          // 防重复逻辑
          if (preventDuplicates && finalTranscript === lastFinalResultRef.current) {
            console.log("⏭️ Skip duplicate:", finalTranscript);
            return;
          }
          
          lastFinalResultRef.current = finalTranscript;
          accumulatedFinalTextRef.current += finalTranscript;
          
          console.log("✅ Final:", finalTranscript);
          console.log("📝 Accumulated:", accumulatedFinalTextRef.current);
          
          // 回调最终结果
          onResult?.(finalTranscript, true);
        }
      };

      recognition.onerror = (event: any) => {
        // 如果正在停止，忽略错误
        if (isStoppingRef.current) {
          return;
        }

        console.error("❌ Speech recognition error:", event.error);
        
        // 对于某些错误，不显示错误消息，允许自动恢复
        const shouldShowError = !["no-speech", "aborted"].includes(event.error);
        
        if (shouldShowError) {
          // 友好的错误消息
          let errorMsg = "Speech recognition error";
          switch (event.error) {
            case "audio-capture":
              errorMsg = "No microphone found. Please check your device.";
              break;
            case "not-allowed":
              errorMsg = "Microphone permission denied. Please allow access.";
              break;
            case "network":
              errorMsg = "Network error. Please check your connection.";
              break;
            default:
              errorMsg = `Speech recognition error: ${event.error}`;
          }
          
          setError(errorMsg);
          onError?.(errorMsg);
        } else {
          // 对于 no-speech 和 aborted，静默处理，不显示错误
          console.log("ℹ️ Speech recognition:", event.error === "no-speech" 
            ? "No speech detected (this is normal if you stop quickly)" 
            : "Recognition aborted");
        }
        
        // 错误后自动停止
        setIsRecording(false);
      };

      recognition.onend = () => {
        console.log("🛑 Speech recognition ended");
        
        // 只有在非主动停止的情况下才清理
        if (!isStoppingRef.current && recognitionRef.current === recognition) {
          setIsRecording(false);
          lastFinalResultRef.current = "";
          accumulatedFinalTextRef.current = "";
          recognitionRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const errorMsg = "Failed to start speech recognition";
      console.error(errorMsg, err);
      setError(errorMsg);
      onError?.(errorMsg);
      setIsRecording(false);
      cleanupRecognition();
    }
  }, [isSupported, language, onResult, onInterimResult, onError, preventDuplicates, cleanupRecognition]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setIsRecording(false);
      return;
    }

    isStoppingRef.current = true;
    setIsRecording(false);

    try {
      // 停止识别
      if (recognitionRef.current.state === "recording" || recognitionRef.current.state === "starting") {
        recognitionRef.current.stop();
      }
    } catch (err) {
      console.warn("Error stopping recognition:", err);
    }

    // 延迟清理，确保 onend 事件能够正常触发
    setTimeout(() => {
      cleanupRecognition();
    }, 100);
  }, [cleanupRecognition]);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    error,
  };
}
