
import React, { useRef, useEffect, useState } from "react"
import { Trash, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecordingPreviewProps {
  isPaused: boolean
  recordingDuration: number
  waveform: { id: string; height: number }[]
  audioURL: string | null
  onDiscard: () => void
  onActivity?: () => void
  formatTime: (seconds: number) => string
  spikeCountRef: React.MutableRefObject<number>
  isRecording: boolean
}

export function RecordingPreview({
  isPaused,
  recordingDuration,
  waveform,
  audioURL,
  onDiscard,
  onActivity,
  formatTime,
  spikeCountRef,
  isRecording
}: RecordingPreviewProps) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)

  // Calculate how many spikes can fit in the container
  useEffect(() => {
    if (!waveformContainerRef.current) return

    const updateSpikeCount = () => {
      const width = waveformContainerRef.current!.offsetWidth
      const count = Math.floor(width / 4)
      spikeCountRef.current = count
    }

    const observer = new ResizeObserver(updateSpikeCount)
    observer.observe(waveformContainerRef.current)

    updateSpikeCount()

    return () => observer.disconnect()
  }, [spikeCountRef])

  const togglePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (audioPlayerRef.current) {
      if (isPlayingPreview) {
        audioPlayerRef.current.pause()
      } else {
        if (audioURL) {
          audioPlayerRef.current.src = audioURL
          audioPlayerRef.current.play()
        }
      }
      setIsPlayingPreview(!isPlayingPreview)
      onActivity?.();
    }
  }

  return (
    <div className="z-10 flex w-full grow items-center justify-between rounded-xl border border-input bg-background p-2 px-4 shadow-sm pr-24">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDiscard}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash className="h-5 w-5" />
      </Button>

      {/* Center: Timer + Visuals */}
      <div className="flex items-center flex-1 px-4 w-full">
        <div className="text-red-500 animate-pulse font-mono text-sm whitespace-nowrap flex items-center">
          {recordingDuration > 0 && <span>●</span>}
          <span className="ml-1 text-foreground font-sans text-base">{formatTime(recordingDuration)}</span>
        </div>
        <div 
          ref={waveformContainerRef}
          className="flex items-center justify-end flex-1 gap-[1px] overflow-hidden h-[30px] mx-4"
        >
          {waveform.map((spike) => (
            <div
              key={spike.id}
              className="bg-primary rounded-full transition-all duration-100 ease-linear w-[3px] shrink-0"
              style={{ height: `${spike.height}%`, minHeight: '4px' }}
            />
          ))}
        </div>

        {isPaused && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${isPlayingPreview ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground"}`}
              onClick={togglePreview}
            > 
              {isPlayingPreview ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <span>{isPlayingPreview ? "Stop" : "Preview"}</span>
            <audio ref={audioPlayerRef} className="hidden" onEnded={() => setIsPlayingPreview(false)} />
          </div>
        )}
      </div>

      {/* Right placeholder or empty */}
      <div className=""></div>
    </div>
  )
}
