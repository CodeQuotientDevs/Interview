
import React from "react"
import { AnimatePresence } from "framer-motion"
import { FilePreview } from "@/components/ui/file-preview"

interface AttachmentListProps {
  files: File[] | null
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
}

export function AttachmentList({ files, setFiles }: AttachmentListProps) {
  if (!files || files.length === 0) return null

  return (
    <div className="absolute inset-x-3 bottom-0 z-20 overflow-x-scroll py-3">
      <div className="flex space-x-3">
        <AnimatePresence mode="popLayout">
          {files.map((file) => {
            return (
              <FilePreview
                key={file.name + String(file.lastModified)}
                file={file}
                onRemove={() => {
                  setFiles((currentFiles) => {
                    if (!currentFiles) return null

                    const filtered = Array.from(currentFiles).filter(
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
  )
}
