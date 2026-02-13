import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export const createGeminiModel = (
    model: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite',
    config?: Omit<ConstructorParameters<typeof ChatGoogleGenerativeAI>[0], 'model'>,
) => {
    return new ChatGoogleGenerativeAI({
        ...config,
        apiKey: GOOGLE_API_KEY,
        model: model,
    });
}
