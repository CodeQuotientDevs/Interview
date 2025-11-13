import { messageSchema } from "@/zod/candidate";
import Zod from 'zod';

export function parseModelResponseToCompatibleForChat(data: typeof messageSchema._type, index: number): MessageType {
    let content = data.rowText;
    let createdAt: Date | undefined;
    try {
        const parsedContent = Zod.object({message: Zod.string(), createdAt: Zod.string()}).parse(JSON.parse(content));
        content = parsedContent.message;
        createdAt = new Date(parsedContent.createdAt);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) { /* empty */ }

    console.log("Data: ", data);
    if (data.role == 'model' || data.role === 'ai') {
        return {
            id: index.toString(),
            content,
            parsedData: {
                editorType: 'inputBox',
                isInterviewGoingOn: true,
                message: content,
                languagesAllowed: [],
                topic: "n/a",
                ...data.parsedResponse,
            },
            role: 'model',
            createdAt,
        };
    }
    return {
        id: index.toString(),
        error: false,
        content: content,
        role: 'user',
        createdAt,
    }
}