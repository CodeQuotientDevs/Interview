
import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea"


interface TextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  placeholders?: string[]
  placeholderInterval?: number
  placeholderAnimationType?: "none" | "fade" | "blur" | "scale" | "slide"
  isDragging: boolean
  showFileList: boolean
  onKeyDownInternal: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onPasteInternal: (event: React.ClipboardEvent) => void
  textAreaRef: React.RefObject<HTMLTextAreaElement>
  allowAttachments?: boolean
}

export function TextInput({
  value,
  placeholders,
  placeholderInterval = 3000,
  placeholderAnimationType = "fade",
  isDragging,
  showFileList,
  onKeyDownInternal,
  onPasteInternal,
  textAreaRef,
  className,
  allowAttachments,
  ...props
}: TextInputProps) {
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)

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
      : props.placeholder

  const showPlaceholder = placeholders && placeholders.length > 0 && value.length === 0 && !isDragging

  useAutosizeTextArea({
    ref: textAreaRef,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [value, showFileList],
  })

  // Manual filtering of props
  // We create a copy of props to avoid mutating the original object if it's reused (unlikely here but good practice)
  const textareaProps = { ...props } as Record<string, any>

  // Filter out file related props if they exist in restProps (from spreading)
  // We don't need to check allowAttachments because these props shouldn't be on a textarea anyway
  if ("files" in textareaProps) delete textareaProps.files
  if ("setFiles" in textareaProps) delete textareaProps.setFiles


  return (
    <>
      {/* Placeholder Animation */}
      {showPlaceholder && (
        <div className={cn("pointer-events-none absolute inset-0 z-20 p-3 pr-24 text-sm text-muted-foreground", showFileList && "pb-16")}>
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

      {/* Text Area */}
      <textarea
        aria-label="Write your prompt here"
        placeholder={showPlaceholder ? "" : props.placeholder}
        ref={textAreaRef}
        onPaste={onPasteInternal}
        onKeyDown={onKeyDownInternal}
        className={cn(
          "z-10 w-full grow resize-none rounded-xl border border-input bg-background p-3 pr-24 text-sm ring-offset-background transition-[border] focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          !showPlaceholder && "placeholder:text-muted-foreground",
          showFileList && "pb-16",
          className
        )}
        value={value}
        {...textareaProps}
      />
    </>
  )
}
