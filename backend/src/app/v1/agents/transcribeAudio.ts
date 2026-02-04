import crypto from "crypto"
import { HumanMessage } from "@langchain/core/messages"
import { createGeminiModel } from "./models/gemini"
import { logger } from "@root/libs"


const transcribeModelName = "gemini-2.5-flash-lite"
const transcribeAudioSystemInstruction = `you are a interview audio transcriber below audio is of an interviewee transcribe the audio to text without any extra information, no timestamps, no extra information , reduce the frequeent words like hmm ,umm etc`

export const transcribeAudio = async (audioUrl: string) => {
  const model = createGeminiModel(transcribeModelName)

  const maxRetries = 3
  let lastError: any = null
  let modelResponse: any = null

  // Initial message
  const message = new HumanMessage({
    content: [
      {
        type: "text",
        text: transcribeAudioSystemInstruction,
      },
      {
        type: "media",
        fileUri: audioUrl,
        mimeType: "audio/webm",
      },
    ],
  })

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      modelResponse = await model.invoke([message])

      if (!modelResponse || !modelResponse.content) {
        throw new Error("Empty transcription response from model")
      }

      // ✅ Success
      break
    } catch (error: any) {
      lastError = error

      logger.error({
        message: `Error transcribing audio (attempt ${attempt}/${maxRetries})`,
        error: error.message,
        stack: error.stack,
      })

      if (attempt === maxRetries) {
        throw error
      }

      // 🔁 Exponential backoff
      const waitTime = Math.pow(2, attempt - 1) * 1000
      const uniqueSuffix = crypto.randomUUID()

      // 🔥 Modify last text message slightly to avoid model cache issues
      if (Array.isArray(message.content)) {
        message.content = message.content.map((item: any) =>
          item.type === "text"
            ? {
                ...item,
                text: `${item.text}\n\nRetry-ID: ${uniqueSuffix}`,
              }
            : item
        )
      }

      logger.info({
        message: `Retrying transcription in ${waitTime}ms`,
        attempt: attempt + 1,
        retryId: uniqueSuffix,
      })

      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  return String(modelResponse.content).trim()
}
