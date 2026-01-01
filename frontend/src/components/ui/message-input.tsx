"use client"


import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Mic, Paperclip, Square, X, Trash, Play, Pause, Send, Loader2 } from "lucide-react"
import { omit } from "remeda"

import { cn } from "@/lib/utils"
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea"
import { Button } from "@/components/ui/button"
import { FilePreview } from "@/components/ui/file-preview"

interface MessageInputBaseProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  submitOnEnter?: boolean
  stop?: () => void
  isGenerating: boolean
  isUploading: boolean
  enableInterrupt?: boolean
  allowEmptySubmit?: boolean
  placeholders?: string[]
  placeholderInterval?: number
  placeholderAnimationType?: "none" | "fade" | "blur" | "scale" | "slide"
  handleAudioSubmission?: (file: File, transcribedAudioText: string, audioDuration: number) => Promise<void>
}

interface MessageInputWithoutAttachmentProps extends MessageInputBaseProps {
  allowAttachments?: false
}

interface MessageInputWithAttachmentsProps extends MessageInputBaseProps {
  allowAttachments: true
  files: File[] | null
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
}

type MessageInputProps =
  | MessageInputWithoutAttachmentProps
  | MessageInputWithAttachmentsProps

export function MessageInput({
  placeholder = "Ask AI...",
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  enableInterrupt = true,
  allowEmptySubmit = false,
  placeholders,
  placeholderInterval = 3000,
  placeholderAnimationType = "fade",
  handleAudioSubmission,
  isUploading,
  ...props
}: MessageInputProps) {
  const trimmedValue = props.value.trim();
  const [isDragging, setIsDragging] = useState(false)
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false)
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)

  // Voice Recording Logic
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Visualizer refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const [waveform, setWaveform] = useState<{ id: string; height: number }[]>([])

  const spikeCountRef = useRef(40)

  // Calculate how many spikes can fit in the container
  useEffect(() => {
  if (!waveformContainerRef.current) return

  const updateSpikeCount = () => {
    const width = waveformContainerRef.current!.offsetWidth
    const count = Math.floor(width / 4)

    if (count > 0 && count !== spikeCountRef.current) {
      
      spikeCountRef.current = count

      if (!isRecording) {
        setWaveform(
          Array.from({ length: count }, (_, i) => ({
            id: `init-${i}`,
            height: 4
          }))
        )
      }
    }
  }

  const observer = new ResizeObserver(updateSpikeCount)
  observer.observe(waveformContainerRef.current)

  updateSpikeCount()

  return () => observer.disconnect()
}, [isRecording])


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        await audioContextRef.current.close()
        audioContextRef.current = null
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      setAudioStream(stream)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)

          //  Update preview immediately
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          const url = URL.createObjectURL(blob)
          setAudioURL(url)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)

      // Start recording duration
      setRecordingDuration(0)

      // Setup AudioContext for visualizer
      const audioContext = new AudioContext()
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.6
      
      const source = audioContext.createMediaStreamSource(stream)
      
      // Noise reduction: High-pass filter to remove low-end hum/rumble below 100Hz
      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 100
      
      source.connect(highPass)
      highPass.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      dataArrayRef.current = dataArray
      console.log("AudioContext state:", audioContext.state)

      visualize(0)

    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const lastFrameTimeRef = useRef<number>(0)

  const visualize = (time: number) => {
    if (!analyserRef.current || !dataArrayRef.current) return

    // Throttle to ~24fps for smoother, less hectic scroll (approx 40ms)
    if (time - lastFrameTimeRef.current < 70) {
      animationFrameRef.current = requestAnimationFrame(visualize)
      return
    }
    lastFrameTimeRef.current = time

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>)

    // Calculate average volume for this frame
    const array = dataArrayRef.current!
    let values = 0

    for (let i = 0; i < array.length; i++) {
      values += array[i]
    }

    const average = values / array.length
    
    // Noise reduction logic: Apply a noise floor threshold and scaling
    // Subtract a small constant to ignore low-level background noise (noise floor)
    const noiseFloor = 15
    const adjustedAverage = Math.max(0, average - noiseFloor)
    const normalized = Math.min(100, Math.max(4, adjustedAverage * 2.2))


    // Update waveform state: append new value, shift if full
    setWaveform(prev => {
      const newSpike = {
        id: `${Date.now()}-${Math.random()}`,
        height: normalized
      }
      
      if (prev.length < spikeCountRef.current) {
        return [...prev, newSpike]
      }
      return [...prev.slice(1), newSpike]
    })

    animationFrameRef.current = requestAnimationFrame(visualize)
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData()
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      visualize(0)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      try {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      } catch (e) { console.error(e) }
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (audioContextRef.current) audioContextRef.current.close()

    setIsRecording(false)
    setIsPaused(false)
    setRecordingDuration(0)
    setAudioStream(null)
    setWaveform(Array.from({ length: spikeCountRef.current }, (_, i) => ({
      id: `reset-${i}`,
      height: 4
    })))
  }

  const discardRecording = () => {
    stopRecording()
    setAudioURL(null)
    audioChunksRef.current = []
  }

  // Handle preview playback
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
    }
  }

  const submitRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      try {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      } catch (e) { console.error(e) }


      if (audioContextRef.current) audioContextRef.current.close()
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)

      setTimeout(() => {
        // const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File(audioChunksRef.current, "voice_message.webm", { type: "audio/webm", lastModified: Date.now() })


       
        handleAudioSubmission?.(file, "", recordingDuration)

        setTimeout(() => {
          textAreaRef.current?.form?.requestSubmit()
          setAudioURL(null)
          audioChunksRef.current = []
          setWaveform(Array.from({ length: spikeCountRef.current }, (_, i) => ({
            id: `submit-${i}`,
            height: 4
          })))
          setIsRecording(false) // Ensure UI resets
          setRecordingDuration(0)
        }, 100)

      }, 200)
    }
  }
  const handleMicClick = () => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording()
      } else {
        
        pauseRecording()
      }
    } else {
      startRecording()
    }
  }

  // Reactive Recording Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording, isPaused])

  // Effect to clean up
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      // if (audioStream) audioStream.getTracks().forEach(track => track.stop()) // Handled via ref
    }
  }, [])

  // Cleanup stream on unmount using ref
  const streamRef = useRef<MediaStream | null>(null)
  useEffect(() => {
    streamRef.current = audioStream
  }, [audioStream])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (!placeholders || placeholders.length === 0) return

    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, placeholderInterval)

    return () => clearInterval(interval)
  }, [placeholders, placeholderInterval])

  const currentPlaceholder =
    placeholders && placeholders.length > 0
      ? placeholders[currentPlaceholderIndex]
      : placeholder

  const showPlaceholder = placeholders && placeholders.length > 0 && props.value.length === 0 && !isDragging

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false)
    }
  }, [isGenerating])

  const addFiles = (files: File[] | null) => {
    if (props.allowAttachments) {
      props.setFiles((currentFiles) => {
        if (currentFiles === null) {
          return files
        }

        if (files === null) {
          return currentFiles
        }

        return [...currentFiles, ...files]
      })
    }
  }

  const onDragOver = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (event: React.DragEvent) => {
    setIsDragging(false)
    if (props.allowAttachments !== true) return
    event.preventDefault()
    const dataTransfer = event.dataTransfer
    if (dataTransfer.files.length) {
      addFiles(Array.from(dataTransfer.files))
    }
  }

  const onPaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    const text = event.clipboardData.getData("text")
    if (text && text.length > 500 && props.allowAttachments) {
      event.preventDefault()
      const blob = new Blob([text], { type: "text/plain" })
      const file = new File([blob], "Pasted text", {
        type: "text/plain",
        lastModified: Date.now(),
      })
      addFiles([file])
      return
    }

    const files = Array.from(items)
      .map((item) => item.getAsFile())
      .filter((file) => file !== null)

    if (props.allowAttachments && files.length > 0) {
      addFiles(files)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()

      if (isGenerating && stop && enableInterrupt) {
        if (showInterruptPrompt) {
          stop()
          setShowInterruptPrompt(false)
          event.currentTarget.form?.requestSubmit()
        } else if (
          trimmedValue ||
          allowEmptySubmit ||
          (props.allowAttachments && props.files?.length)
        ) {
          setShowInterruptPrompt(true)
          return
        }
      }

      event.currentTarget.form?.requestSubmit()
    }

    onKeyDownProp?.(event)
  }

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

  const showFileList =
    props.allowAttachments && props.files && props.files.length > 0

  useAutosizeTextArea({
    ref: textAreaRef,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [props.value, showFileList],
  })

  return (
    <div
      className="relative flex w-full"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {enableInterrupt && (
        <InterruptPrompt
          isOpen={showInterruptPrompt}
          close={() => setShowInterruptPrompt(false)}
        />
      )}

      {showPlaceholder && !isRecording && (
        <div className={cn("pointer-events-none absolute inset-0 z-20 p-3 pr-24 text-sm text-muted-foreground", showFileList && "pb-16")} ref={containerRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPlaceholder}
              initial={
                placeholderAnimationType === "blur" ? { opacity: 0, filter: "blur(4px)" } :
                  placeholderAnimationType === "scale" ? { opacity: 0, scale: 0.9 } :
                    placeholderAnimationType === "slide" ? { opacity: 0, y: 5 } :
                      { opacity: 0 }
              }
              animate={
                placeholderAnimationType === "blur" ? { opacity: 1, filter: "blur(0px)" } :
                  placeholderAnimationType === "scale" ? { opacity: 1, scale: 1 } :
                    placeholderAnimationType === "slide" ? { opacity: 1, y: 0 } :
                      { opacity: 1 }
              }
              exit={
                placeholderAnimationType === "blur" ? { opacity: 0, filter: "blur(4px)" } :
                  placeholderAnimationType === "scale" ? { opacity: 0, scale: 0.95 } :
                    placeholderAnimationType === "slide" ? { opacity: 0, y: -5 } :
                      { opacity: 0 }
              }
              transition={{ duration: 0.3 }}
              className="truncate"
            >
              {currentPlaceholder}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {isRecording ? (
        <div className="z-10 flex w-full grow items-center justify-between rounded-xl border border-input bg-background p-2 px-4 shadow-sm pr-24">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={discardRecording}
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
                  type="button" // Ensure it's a button
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
      ) : (
        <textarea
          aria-label="Write your prompt here"
          placeholder={showPlaceholder ? "" : placeholder}
          ref={textAreaRef}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          className={cn(
            "z-10 w-full grow resize-none rounded-xl border border-input bg-background p-3 pr-24 text-sm ring-offset-background transition-[border] focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            !showPlaceholder && "placeholder:text-muted-foreground",
            showFileList && "pb-16",
            className
          )}
          {...(props.allowAttachments
            ? omit(props, ["allowAttachments", "files", "setFiles"])
            : omit(props, ["allowAttachments"]))}
        />
      )}

      {props.allowAttachments && (
        <div className="absolute inset-x-3 bottom-0 z-20 overflow-x-scroll py-3">
          <div className="flex space-x-3">
            <AnimatePresence mode="popLayout">
              {props.files?.map((file) => {
                return (
                  <FilePreview
                    key={file.name + String(file.lastModified)}
                    file={file}
                    onRemove={() => {
                      props.setFiles((files) => {
                        if (!files) return null

                        const filtered = Array.from(files).filter(
                          (f) => f !== file
                        )
                        if (filtered.length === 0) return null
                        return filtered
                      })
                    }}
                  />
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="absolute right-3 bottom-3 z-20 flex gap-2">
        {(
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "default" : "outline"}
            className={cn("h-8 w-8", isRecording && !isPaused && "animate-pulse bg-red-500 hover:bg-red-600")}
            aria-label={isRecording ? (isPaused ? "Resume recording" : "Pause recording") : "Start recording"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMicClick();
            }}
          >
            {isRecording ? (isPaused ? <Mic className="h-4 w-4" /> : <Pause className="h-4 w-4" />) : <Mic className="h-4 w-4" />}
          </Button>
        )}
        {props.allowAttachments && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Attach a file"
            onClick={async () => {
              const files = await showFileUploadDialog()
              addFiles(files)
            }}
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
            type="button" // Changed to button to handle logic manually
            size="icon"
            className="h-8 w-8 transition-opacity"
            aria-label="Send message"
            disabled={(!allowEmptySubmit && trimmedValue === "" && !isRecording) || isGenerating}
            onClick={() => {
              if (isRecording) {
                submitRecording()
              } else {
                textAreaRef.current?.form?.requestSubmit()
              }
            }}
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

      {props.allowAttachments && <FileUploadOverlay isDragging={isDragging} />}
    </div>
  )
}
MessageInput.displayName = "MessageInput"

interface InterruptPromptProps {
  isOpen: boolean
  close: () => void
}

function InterruptPrompt({ isOpen, close }: InterruptPromptProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ top: 0, filter: "blur(5px)" }}
          animate={{
            top: -40,
            filter: "blur(0px)",
            transition: {
              type: "spring",
              filter: { type: "tween" },
            },
          }}
          exit={{ top: 0, filter: "blur(5px)" }}
          className="absolute left-1/2 flex -translate-x-1/2 overflow-hidden whitespace-nowrap rounded-full border bg-background py-1 text-center text-sm text-muted-foreground"
        >
          <span className="ml-2.5">Press Enter again to interrupt</span>
          <button
            className="ml-1 mr-2.5 flex items-center"
            type="button"
            onClick={close}
            aria-label="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface FileUploadOverlayProps {
  isDragging: boolean
}

function FileUploadOverlay({ isDragging }: FileUploadOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center space-x-2 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          <Paperclip className="h-4 w-4" />
          <span>Drop your files here to attach them.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function showFileUploadDialog() {
  const input = document.createElement("input")

  input.type = "file"
  input.multiple = true
  input.accept = "*/*"
  input.click()

  return new Promise<File[] | null>((resolve) => {
    input.onchange = (e) => {
      const files = (e.currentTarget as HTMLInputElement).files

      if (files) {
        resolve(Array.from(files))
        return
      }

      resolve(null)
    }
  })
}
