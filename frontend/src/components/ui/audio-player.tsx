"use client"

import * as React from "react"
import { Pause, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface AudioPlayerProps {
  src: string 
  className?: string
  duration?: number
  variant?: "primary" | "secondary"
}

export function AudioPlayer({ src, className, duration: initialDuration, variant = "secondary" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [duration] = React.useState(initialDuration || 0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(!initialDuration)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = src


    const setAudioTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      audio.currentTime = 0
    }

    const handleError = (e: ErrorEvent) => {
      console.error("Audio loading error:", e)
      setIsLoading(false)
    }

    audio.addEventListener("timeupdate", setAudioTime)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)


    return () => {
      audio.removeEventListener("timeupdate", setAudioTime)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
    }
  }, [src])

  const togglePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        await audio.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("Error playing audio:", error)
      setIsPlaying(false)
    }
  }

  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    
    const newTime = Math.min(value[0], duration)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl p-2.5 min-w-[220px] transition-all",
      variant === "primary" 
        ? "bg-primary text-primary-foreground shadow-lg" 
        : "border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-white/10",
      className
    )}>
      <audio ref={audioRef} src={src} preload="metadata"/>
      <Button
        variant={variant === "primary" ? "outline" : "secondary"}
        size="icon"
        className={cn(
          "h-9 w-9 shrink-0 rounded-full relative z-10 transition-transform active:scale-95 border border-white/10",
          variant === "primary" && "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
        )}
        onClick={(e) => {
          e.stopPropagation()
          togglePlayPause()
        }}
        disabled={isLoading}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </Button>
      <div className="flex w-full flex-col gap-1 min-w-0">
        <Slider
          value={[currentTime]}
          max={duration > 0 ? duration : 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className={cn(
            "w-full cursor-pointer",
            variant === "primary" && "[&_[role=slider]]:bg-primary-foreground [&_[role=slider]]:border-primary-foreground/50 [&_.relative_div]:bg-primary-foreground/20 [&_.absolute_div]:bg-primary-foreground"
          )}
          disabled={isLoading || duration === 0}
        />
        <div className={cn(
          "flex w-full justify-between px-1 text-[10px] font-mono tabular-nums tracking-tighter pointer-events-none select-none",
          variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground/70"
        )}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}