
import React from "react"
import { Mic, Pause, Paperclip, Square, Send, ArrowUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ActionButtonsProps {
  isRecording: boolean
  isPaused: boolean
  isGenerating: boolean
  isUploading: boolean
  allowAttachments?: boolean
  stop?: () => void
  handleMicClick: (e: React.MouseEvent) => void
  onAttachClick: () => void
  onSendClick: () => void
}

export function ActionButtons({
  isRecording,
  isPaused,
  isGenerating,
  isUploading,
  allowAttachments,
  stop,
  handleMicClick,
  onAttachClick,
  onSendClick
}: ActionButtonsProps) {
  return (
    <div className="absolute right-3 bottom-3 z-20 flex gap-2">
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "default" : "outline"}
        className={cn("h-8 w-8", isRecording && !isPaused && "animate-pulse bg-red-500 hover:bg-red-600")}
        aria-label={isRecording ? (isPaused ? "Resume recording" : "Pause recording") : "Start recording"}
        onClick={handleMicClick}
      >
        {isRecording ? (isPaused ? <Mic className="h-4 w-4" /> : <Pause className="h-4 w-4" />) : <Mic className="h-4 w-4" />}
      </Button>

      {allowAttachments && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="Attach a file"
          onClick={onAttachClick}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      )}

      {isGenerating && stop ? (
        <Button
          type="button"
          size="icon"
          className="h-8 w-8"
          aria-label="Stop generating"
          onClick={stop}
        >
          <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 transition-opacity"
          aria-label="Send message"
          disabled={isGenerating || isUploading || (isRecording && !isPaused)}
          onClick={onSendClick}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isRecording ? (
            <Send className="h-5 w-5" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </Button>
      )}
    </div>
  )
}
