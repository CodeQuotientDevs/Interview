import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createGeminiModel} from "./gemini";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

type models = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite';

export function createModel(model: models, config?: Omit<ConstructorParameters<typeof ChatGoogleGenerativeAI>[0], 'model'>,): BaseChatModel {
    if (model.startsWith('gemini')) {
        return createGeminiModel(model, config) as any as BaseChatModel;
    }
    throw new Error('Invalid model type provided');
}

export default createModel;