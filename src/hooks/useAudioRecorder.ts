"use client";

import { useCallback, useRef, useState } from "react";

interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      startedAtRef.current = Date.now();
      setIsRecording(true);
    } catch {
      setError("Microphone access is required. Allow mic permission and try again.");
      stopStream();
      setIsRecording(false);
    }
  }, [stopStream]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state !== "recording") {
      return null;
    }

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        const durationMs = startedAtRef.current
          ? Date.now() - startedAtRef.current
          : 0;

        stopStream();
        setIsRecording(false);
        startedAtRef.current = null;
        mediaRecorderRef.current = null;

        resolve({
          blob,
          url,
          duration: durationMs / 1000,
        });
      };

      mediaRecorder.stop();
    });
  }, [stopStream]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}
