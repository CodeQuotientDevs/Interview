import { messageSchema } from "@/zod/candidate";
import Zod from 'zod';

export function parseModelResponseToCompatibleForChat(data: typeof messageSchema._type, index: number): MessageType {
    let content = data.rowText;
    try {
        const parsedContent = Zod.object({message: Zod.string(), createdAt: Zod.string()}).parse(JSON.parse(content));
        content = parsedContent.message;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) { /* empty */ }

    if (data.role == 'model' || data.role === 'ai') {
        return {
            id: index.toString(),
            content,
            role: 'model',
            createdAt: data.createdAt,
            type: data.type,
            audioUrl: data.audioUrl,
            audioDuration: data.audioDuration,
        };
    }
    return {
        id: index.toString(),
        error: false,
        content: content,
        role: 'user',
        createdAt: data.createdAt,
        type: data.type,
        audioUrl: data.audioUrl,
        audioDuration: data.audioDuration,
    }
}