
import React, { useRef, useEffect, useState } from "react"
import { Trash, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
}: RecordingPreviewProps) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const [playbackWaveform, setPlaybackWaveform] = useState<{ id: string; height: number }[]>([])
  const [isAudioReady, setIsAudioReady] = useState(false)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  // const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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

  // Handle playback duration for animation
  useEffect(() => {
    if (isPlayingPreview && isAudioReady && audioPlayerRef.current) {
      const updatePlayback = () => {
        if (audioPlayerRef.current && audioPlayerRef.current.currentTime > 0) {
          setPlaybackDuration(audioPlayerRef.current.currentTime)
        }
        animationFrameRef.current = requestAnimationFrame(updatePlayback)
      }
      
      animationFrameRef.current = requestAnimationFrame(updatePlayback)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlayingPreview, isAudioReady])

  // Calculate waveform for playback animation
  useEffect(() => {
    if (isPlayingPreview && waveform.length > 0) {
      const progress = recordingDuration > 0 ? playbackDuration / recordingDuration : 0
      // const spikesPerSecond = waveform.length / recordingDuration
      const displaySpikes = Math.floor(progress * waveform.length)
      
      setPlaybackWaveform(waveform.slice(0, displaySpikes))
    }
  }, [isPlayingPreview, playbackDuration, waveform, recordingDuration])

  const togglePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (audioPlayerRef.current) {
      if (isPlayingPreview) {
        audioPlayerRef.current.pause()
        setIsPlayingPreview(false)
        setIsAudioReady(false)
      } else {
        if (audioURL) {
          audioPlayerRef.current.src = audioURL
          audioPlayerRef.current.currentTime = 0
          setPlaybackDuration(0)
          setPlaybackWaveform([])
          audioPlayerRef.current.play()
          setIsPlayingPreview(true)
        }
      }
      onActivity?.();
    }
  }

  return (
    <div className="z-10 flex w-full grow items-center justify-between rounded-xl border border-input bg-background p-2 px-4 shadow-sm pr-24">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash className="h-5 w-5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the recorded audio? This action cannot be reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Center: Timer + Visuals */}
      <div className="flex items-center flex-1 px-4 w-full">
        <div className="text-red-500 animate-pulse font-mono text-sm whitespace-nowrap flex items-center">
          {isPlayingPreview ? (
            <>
              <span>▶</span>
              <span className="ml-1 text-foreground font-sans text-base">{formatTime(Math.floor(playbackDuration))}</span>
            </>
          ) : (
            <>
              {recordingDuration > 0 && <span>●</span>}
              <span className="ml-1 text-foreground font-sans text-base">{formatTime(recordingDuration)}</span>
            </>
          )}
        </div>
        <div 
          ref={waveformContainerRef}
          className="flex items-center justify-end flex-1 gap-[1px] overflow-hidden h-[30px] mx-4"
        >
          {isPlayingPreview ? (
            // During playback, show animated waveform progressing left to right
            playbackWaveform.map((spike) => (
              <div
                key={spike.id}
                className="bg-primary rounded-full transition-all duration-100 ease-linear w-[3px] shrink-0"
                style={{ height: `${spike.height}%`, minHeight: '4px' }}
              />
            ))
          ) : (
            // During recording preview, show full waveform
            waveform.map((spike) => (
              <div
                key={spike.id}
                className="bg-primary rounded-full transition-all duration-100 ease-linear w-[3px] shrink-0"
                style={{ height: `${spike.height}%`, minHeight: '4px' }}
              />
            ))
          )}
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
            <audio 
              ref={audioPlayerRef} 
              className="hidden" 
              onPlaying={() => setIsAudioReady(true)}
              onPause={() => setIsAudioReady(false)}
              onEnded={() => {
                setIsPlayingPreview(false)
                setIsAudioReady(false)
                setPlaybackDuration(0)
                setPlaybackWaveform([])
              }} 
            />
          </div>
        )}
      </div>

      {/* Right placeholder or empty */}
      <div className=""></div>
    </div>
  )
}
