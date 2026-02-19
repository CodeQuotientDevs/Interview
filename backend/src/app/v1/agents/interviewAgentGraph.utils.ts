import { AIMessage } from "@langchain/core/messages";
import type { MessageType } from "./InterviewAgentGraph"; 
import redisConstant from '@root/constants/redis';
import redis from '@services/redis';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import createModel from "./models";
import { compressQuestionListSystemInstruction } from "./systemInstruction";
import { logger } from "@root/libs";
import { Interview } from '@app/v1/routes/interview/data-access/interview.model';


export function hasTextContent(message: AIMessage): boolean {
    const content = message.content;
    if (typeof content === 'string') return content.trim().length > 0;
    return content.some((ele: any) => ele.type === 'text' && ele.text?.trim().length > 0);
}

export function createFallbackAIMessage(): MessageType {
    return {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        message: new AIMessage("Thank you for your time! The interview has concluded. We'll be in touch with the results soon."),
    };
}

export function filterEmptyAIMessages(messages: MessageType[]): MessageType[] {
    return messages.filter(msg => {
        if (msg.message instanceof AIMessage) {
            return hasTextContent(msg.message);
        }
        return true;
    });
}

export async function getCompressedQuestionList(interview: Interview): Promise<string> {
    const questionListKey = redisConstant.getInterviewQuestions(interview.id.toString());
    const isPresentRedis = await redis.exists(questionListKey);

    if (isPresentRedis) {
        logger.info('Found question list in redis for interview id: ' + interview.id.toString());
        return await redis.get(questionListKey) as string;
    }

    let questionList = "";
    for (let diff of interview.difficulty) {
        questionList += diff.skill + "\n" + diff.questionList + "\n\n";
    }

    if (!questionList) return "";

    logger.info('Compressing question list for interview id: ' + interview.id.toString());
    const agent = createAgent({
        model: createModel("gemini-2.5-flash-lite"),
        tools: [],
    });

    const modelResponse = await agent.invoke({
        messages: [
            new SystemMessage(compressQuestionListSystemInstruction),
            new HumanMessage(questionList),
        ],
    });

    const compressed = modelResponse.messages[modelResponse.messages.length - 1].content as string;
    await redis.set(questionListKey, compressed);
    logger.info('Compressed question list stored in redis for interview id: ' + interview.id.toString());

    return compressed;
}