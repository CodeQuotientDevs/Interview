
import { useRef, useState, useEffect, useCallback } from "react"

export interface UseAudioRecordingProps {
  onRecordingComplete?: (file: File, duration: number) => void
  onActivity?: () => void
}

export function useAudioRecording({ onRecordingComplete, onActivity }: UseAudioRecordingProps = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [waveform, setWaveform] = useState<{ id: string; height: number }[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Visualizer refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const spikeCountRef = useRef(40)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const visualize = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>)

    const array = dataArrayRef.current!
    let values = 0

    for (let i = 0; i < array.length; i++) {
      values += array[i]
    }

    const average = values / array.length
    
    const noiseFloor = 15
    const adjustedAverage = Math.max(0, average - noiseFloor)
    const normalized = Math.min(100, Math.max(4, adjustedAverage * 2.2))

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
  }, [])

   const lastFrameTimeRef = useRef<number>(0)
   const visualizeThrottled = useCallback((time: number) => {
      animationFrameRef.current = requestAnimationFrame(visualizeThrottled)
      
      if (time - lastFrameTimeRef.current < 70) {
        return
      }
      lastFrameTimeRef.current = time
      visualize()
   }, [visualize])


  const startRecording = useCallback(async () => {
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
      setRecordingDuration(0)
      onActivity?.();

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
      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 100
      
      source.connect(highPass)
      highPass.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      dataArrayRef.current = dataArray

      visualizeThrottled(0)

    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }, [onActivity, visualizeThrottled])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData()
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      onActivity?.();

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [onActivity])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      visualizeThrottled(0)
      onActivity?.();
    }
  }, [onActivity, visualizeThrottled])

  const stopRecording = useCallback(() => {
    onActivity?.();
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
  }, [onActivity])

  const discardRecording = useCallback(() => {
    stopRecording()
    setAudioURL(null)
    audioChunksRef.current = []
  }, [stopRecording])

  const submitRecording = useCallback(() => {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        try {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        } catch (e) { console.error(e) }
  
        if (audioContextRef.current) audioContextRef.current.close()
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        
        onActivity?.();
  
        setTimeout(() => {
          const file = new File(audioChunksRef.current, "voice_message.webm", { type: "audio/webm", lastModified: Date.now() })
          
          if(onRecordingComplete) {
              onRecordingComplete(file, recordingDuration)
          }

          setAudioURL(null)
          audioChunksRef.current = []
          setWaveform(Array.from({ length: spikeCountRef.current }, (_, i) => ({
            id: `submit-${i}`,
            height: 4
          })))
          setIsRecording(false) 
          setRecordingDuration(0)
  
        }, 200)
      }
  }, [onActivity, onRecordingComplete, recordingDuration])


  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        onActivity?.();
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
  }, [isRecording, isPaused, onActivity])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  // Cleanup stream on unmount
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

  return {
    isRecording,
    isPaused,
    recordingDuration,
    audioURL,
    waveform,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    submitRecording,
    formatTime,
    spikeCountRef // Exposed to allow the UI to update the spike count based on width
  }
}
