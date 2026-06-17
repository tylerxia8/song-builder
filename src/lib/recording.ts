let activeStream: MediaStream | null = null;
let activeRecorder: MediaRecorder | null = null;
let activeChunks: Blob[] = [];
let startedAtMs = 0;

function stopStream() {
  activeStream?.getTracks().forEach((track) => track.stop());
  activeStream = null;
}

export async function startMicCapture(): Promise<void> {
  if (activeRecorder?.state === "recording") {
    throw new Error("Already recording.");
  }

  stopStream();
  activeChunks = [];

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) activeChunks.push(event.data);
  };

  recorder.start(250);
  activeStream = stream;
  activeRecorder = recorder;
  startedAtMs = Date.now();
}

export function isMicCaptureActive(): boolean {
  return activeRecorder?.state === "recording";
}

export async function stopMicCapture(): Promise<{ blob: Blob; durationSec: number }> {
  const recorder = activeRecorder;
  if (!recorder || recorder.state !== "recording") {
    throw new Error("Not recording.");
  }

  const durationSec = Math.max(0.1, (Date.now() - startedAtMs) / 1000);

  const blob = await new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(activeChunks, { type: recorder.mimeType || "audio/webm" }));
    };
    recorder.onerror = () => reject(new Error("Recording failed."));
    recorder.stop();
  });

  stopStream();
  activeRecorder = null;
  activeChunks = [];

  return { blob, durationSec };
}

export function cancelMicCapture() {
  if (activeRecorder && activeRecorder.state === "recording") {
    activeRecorder.stop();
  }
  stopStream();
  activeRecorder = null;
  activeChunks = [];
}

export function secondsToBeats(seconds: number, bpm: number): number {
  return Math.max(1, (seconds * bpm) / 60);
}

export function micPermissionMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access was blocked. Allow the mic in your browser, then try again.";
    }
    if (error.name === "NotFoundError") {
      return "No microphone was found. Connect a mic or check your system settings.";
    }
  }
  return "Could not start recording. Check your microphone and try again.";
}
