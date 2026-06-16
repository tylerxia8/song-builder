"use client";

interface RecordButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function RecordButton({
  isRecording,
  disabled = false,
  onStart,
  onStop,
}: RecordButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={isRecording ? onStop : onStart}
      className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        isRecording
          ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.45)]"
          : "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_40px_rgba(168,85,247,0.35)] hover:scale-105"
      }`}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording ? (
        <span className="h-7 w-7 rounded-sm bg-white" />
      ) : (
        <span className="h-8 w-8 rounded-full bg-white" />
      )}
      {isRecording && (
        <span className="absolute -inset-2 animate-ping rounded-full border border-red-400/60" />
      )}
    </button>
  );
}
