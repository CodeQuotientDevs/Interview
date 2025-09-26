import { Content } from "@google/generative-ai";
import Zod from 'zod';

const modelResponseSchema = Zod.object({
    editorType: Zod.enum(['editor', 'inputBox']),
    isInterviewGoingOn: Zod.boolean(),
    message: Zod.string().nonempty(),
    topic: Zod.string().nonempty().optional(),
    languagesAllowed: Zod.array(Zod.object({
        label: Zod.string(),
        value: Zod.string(),
    })).default([{
        label: "Javascript",
        value: "javascript",
    }]),
})

export function parseModelResponseToCompatibleForChat(data: Content, index: number) {
    let content = data.parts?.[0]?.text ?? '';
    let createdAt: Date | undefined;
    try {
        const parsedContent = Zod.object({message: Zod.string(), createdAt: Zod.string()}).parse(JSON.parse(content));
        content = parsedContent.message;
        createdAt = new Date(parsedContent.createdAt);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) { /* empty */ }

    if (data.role == 'model') {
        try {
            
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsedData = JSON.parse(content ?? '{}');
            const parsedResponse = modelResponseSchema.safeParse(parsedData);
            if (parsedResponse.error) {
                return {
                    id: index.toString(),
                    content: content,
                    role: 'model',
                    error: true,
                    createdAt,
                }
            }
            return {
                id: index.toString(),
                content: parsedResponse.data.message,
                parsedData: parsedResponse.data,
                role: 'model',
                createdAt,
            }
        } catch (error) {
            console.log(error);
            return {
                id: index.toString(),
                content: data.parts.map(ele => ele.text).join(' '),
                error: true,
                role: 'model',
                createdAt,
            }
        }
    }
    return {
        id: index.toString(),
        error: false,
        content: content,
        role: 'user',
        createdAt,
    }
}