
"use client"

import React, { useRef, useState, useEffect } from "react"
import { useAudioRecording } from "./hooks/use-audio-recording"
import { RecordingPreview } from "./recording-preview"
import { AttachmentList } from "./attachment-list"
import { TextInput } from "./text-input"
import { ActionButtons } from "./action-buttons"
import { InterruptPrompt } from "./interrupt-prompt"
import { FileUploadOverlay } from "./file-upload-overlay"

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
  handleAudioSubmission?: (file: File, audioDuration: number) => Promise<void>
  handleActivity?: () => void
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
  placeholder = "",
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
  handleActivity,
  ...props
}: MessageInputProps) {
  const trimmedValue = props.value.trim();
  const [isDragging, setIsDragging] = useState(false)
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

  const {
    isRecording,
    isPaused,
    recordingDuration,
    audioURL,
    waveform,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    submitRecording,
    formatTime,
    spikeCountRef
  } = useAudioRecording({
    onRecordingComplete: handleAudioSubmission,
    onActivity: handleActivity
  });

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false)
    }
  }, [isGenerating])

  // Warn user before reloading if there's recorded audio
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (audioURL) {
        e.preventDefault()
        // Modern browsers require returnValue to be set
        e.returnValue = ''
        // Some browsers use the return value as the message
        return 'Are you sure you want to reload? Your recorded audio will be lost.'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [audioURL])

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

  const handleMicClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const onSendClick = () => {
      if (isRecording) {
        submitRecording()
       setTimeout(() => {
         textAreaRef.current?.form?.requestSubmit()
       }, 300) // Small delay to ensure state updates
      } else {
        textAreaRef.current?.form?.requestSubmit()
      }
  }
  
  const showFileList = props.allowAttachments && props.files && props.files.length > 0

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

      {isRecording ? (
        <RecordingPreview
          isPaused={isPaused}
          recordingDuration={recordingDuration}
          waveform={waveform}
          audioURL={audioURL}
          onDiscard={discardRecording}
          onActivity={handleActivity}
          formatTime={formatTime}
          spikeCountRef={spikeCountRef}
          isRecording={isRecording}
        />
      ) : (
        <TextInput
            placeholders={placeholders}
            placeholderInterval={placeholderInterval}
            placeholderAnimationType={placeholderAnimationType}
            isDragging={isDragging}
            showFileList={!!showFileList}
            onKeyDownInternal={onKeyDown}
            onPasteInternal={onPaste}
            textAreaRef={textAreaRef}
            placeholder={placeholder}
            className={className}
            allowAttachments={props.allowAttachments}
            {...props}
        />
      )}

      {props.allowAttachments && (
        <AttachmentList files={props.files} setFiles={props.setFiles} />
      )}

      <ActionButtons
        isRecording={isRecording}
        isPaused={isPaused}
        isGenerating={isGenerating}
        isUploading={isUploading}
        allowAttachments={props.allowAttachments}
        stop={stop}
        handleMicClick={handleMicClick}
        onAttachClick={async () => {
            const files = await showFileUploadDialog()
            addFiles(files)
        }}
        onSendClick={onSendClick}
      />

      {props.allowAttachments && <FileUploadOverlay isDragging={isDragging} />}
    </div>
  )
}

MessageInput.displayName = "MessageInput"

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
