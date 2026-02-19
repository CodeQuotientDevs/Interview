import zod, { z } from "zod";
import { MessageTypeEnum } from '@root/constants/message';
import {
    StateGraph,
    START,
    END,
    Annotation,
} from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

import { checkPointer } from "./db/history";
import type { Interview } from "@app/v1/routes/interview/data-access/interview.model";
import type { Candidate } from "@app/v1/routes/candidate/data-access/candidate.model";
import type { SingleUserModel as BasicUserDetails } from "@app/v1/routes/user/data-access/user.model";

import {
    systemInstructionCurrentInterview,
    systemInstructionForGeneratingReport,
} from "./systemInstruction";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import createModel from "./models";
import { createAgent, tool } from "langchain";

import { interviewReportSchema } from "./schema/interviewAgent";
import { logger } from "@root/libs";
import { transcribeAudio } from "./transcribeAudio";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createFallbackAIMessage, hasTextContent, filterEmptyAIMessages, getCompressedQuestionList } from './interviewAgentGraph.utils';


export type MessageType = {
    id: string,
    createdAt: Date,
    message: BaseMessage,
    toDelete?: boolean,
}

const InterviewState = Annotation.Root({
    messages: Annotation<MessageType[]>({
        reducer: (current, update) => {
            const deletedIds = new Set(
                update.filter(msg => msg.toDelete).map(msg => msg.id)
            );
            const updateIds = new Set(
                update.filter(msg => !msg.toDelete).map(msg => msg.id)
            );

            const filteredCurrent = current.filter(
                msg => !updateIds.has(msg.id) && !deletedIds.has(msg.id)
            );

            return filteredCurrent.concat(update.filter(msg => !msg.toDelete));
        },
        default: () => [],
    }),
    latestAiResponse: Annotation<MessageType | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    interviewStartTime: Annotation<Date>({
        reducer: (current, update) => update ?? current,
        default: () => new Date(),
    }),
    isInterviewGoingOn: Annotation<boolean>({
        reducer: (current, update) => update ?? current,
        default: () => true,
    }),
});


type InterviewStateType = typeof InterviewState.State;

let compiledGraph: any = null;

const endInterviewTool = tool(() => "Interview ended successfully", {
    name: "end_interview",
    description: "end the interview immediately. This tool should be used when the interview is complete and you want to end it.",
    schema: z.object({
    }),
});

async function ensureGraphCompiled() {
    if (compiledGraph) return compiledGraph;
    const builder = new StateGraph(InterviewState)
        .addNode("askAndRespond", async (state: InterviewStateType, config: any) => {

            if (state.isInterviewGoingOn === false) {
                const lastMsg = state.messages[state.messages.length - 1];
                if (lastMsg?.message instanceof AIMessage && !hasTextContent(lastMsg.message)) {
                    const fallback = createFallbackAIMessage();
                    return { messages: [fallback], latestAiResponse: fallback };
                }
                return {};
            }
            const ctx = config.configurable?.context ?? {};
            const { interview, candidate, user, model } = ctx;

            if (!model || typeof model.invoke !== "function") {
                throw new Error("runtime.context.model missing or invalid. Pass a model instance with invoke({ messages }).");
            }
            let compressedQuestionList = await getCompressedQuestionList(interview as Interview);
            const systemPrompt = systemInstructionCurrentInterview(
                interview as Interview,
                candidate as Candidate,
                user as BasicUserDetails,
                compressedQuestionList,
            );
            let enhancedSystemPrompt = systemPrompt;

            const messagesToDelete: Array<MessageType> = [];

            const messagesToAdd = state.messages.map(ele => ele.message);
            let updates: any = {};

            const isFirstMessage = messagesToAdd.length == 1;
            let currentTime = Date.now();

            // Set start time on first message
            if (isFirstMessage) {
                updates.interviewStartTime = currentTime;
                enhancedSystemPrompt += `\n\nIMPORTANT: This is the FIRST message. Interview start time has been set to: ${new Date(currentTime).toISOString()}.`;
            } else if (state.interviewStartTime) {
                // Calculate elapsed time
                const startTimeMs = typeof state.interviewStartTime === 'number'
                    ? state.interviewStartTime
                    : state.interviewStartTime.getTime();
                const elapsedMs = currentTime - startTimeMs;
                const elapsedMinutes = Math.floor(elapsedMs / 60000);
                const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
                enhancedSystemPrompt += `\n\nInterview Start Time: ${new Date(startTimeMs).toISOString()}. Current Time: ${new Date(currentTime).toISOString()}. Elapsed Time: ${elapsedMinutes} minutes and ${elapsedSeconds} seconds. Current message count: ${messagesToAdd.length}.`;
            }

            let messagesForModel: BaseMessage[] = [
                new SystemMessage(enhancedSystemPrompt),
                ...messagesToAdd,
            ];

            let modelResponse;
            const maxRetries = 6;
            let lastError: any;
            const modelWithTools = model.bindTools([endInterviewTool]);
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    modelResponse = await modelWithTools.invoke(messagesForModel);

                    if (!modelResponse) {
                        throw new Error("Model returned empty response");
                    }

                    break;
                } catch (error: any) {
                    lastError = error;
                    logger.error({
                        message: `Error invoking model (attempt ${attempt}/${maxRetries})`,
                        error: error.message,
                        stack: error.stack,
                        messagesCount: messagesForModel.length,
                    });

                    // If this was the last attempt, throw the error
                    if (attempt === maxRetries) {
                        throw error;
                    }

                    // Wait before retrying (exponential backoff: 1s, 2s, 4s)
                    const waitTime = Math.pow(2, attempt - 1) * 1000;

                    logger.info({
                        message: `Retrying model invocation in ${waitTime}ms`,
                        attempt: attempt + 1,
                        lastMessageContent: messagesForModel[messagesForModel.length - 1].content,
                    });
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            logger.info('Ai Response Came');
            modelResponse.content = modelResponse.content.filter((ele: any) => ele.type == 'text');


            const newAiMessage: MessageType = {
                id: crypto.randomUUID(),
                message: modelResponse,
                createdAt: new Date(),
            };

            updates.messages = [newAiMessage, ...messagesToDelete];
            updates.latestAiResponse = newAiMessage;


            return {
                ...updates,
            };
        })
        .addNode("executeTools", async (state: InterviewStateType) => {
            const lastMessageWrapper = state.messages[state.messages.length - 1];
            if (!lastMessageWrapper) {
                return { messages: [] };
            }
            logger.info('Executing tool call');
            const lastMessage = lastMessageWrapper.message;
            if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
                return { messages: [] };
            }
            const toolMessages: ToolMessage[] = [];
            let updates: any = {};
            for (const toolCall of lastMessage.tool_calls) {
                try {
                    let result: any;
                    switch (toolCall.name) {
                        case "end_interview":
                            updates.isInterviewGoingOn = false;
                            result = "Interview ended successfully";
                            break;
                        default:
                            result = `Tool ${toolCall.name} not found`;
                    }

                    toolMessages.push(
                        new ToolMessage({
                            content: typeof result === "string" ? result : JSON.stringify(result),
                            tool_call_id: toolCall.id || "",
                            name: toolCall.name,
                        })
                    );
                } catch (error: any) {
                    toolMessages.push(
                        new ToolMessage({
                            content: `Error executing tool: ${error.message}`,
                            tool_call_id: toolCall.id || "",
                            name: toolCall.name,
                        })
                    );
                }
            }
            const newToolMessages: MessageType[] = toolMessages.map(toolMsg => ({
                id: crypto.randomUUID(),
                message: toolMsg,
                createdAt: new Date(),
            }));

            return { messages: newToolMessages, ...updates };
        })
        .addEdge(START, "askAndRespond")
        .addEdge("executeTools", "askAndRespond")
        .addConditionalEdges(
            "askAndRespond",
            (state: InterviewStateType) => {
                const lastMessageWrapper = state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
                if (!lastMessageWrapper) {
                    return "end";
                }

                const lastMessage = lastMessageWrapper.message;

                if (lastMessage instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                    return "tools";
                }
                return "end";
            },
            {
                tools: "executeTools",
                end: END,
            }
        );


    compiledGraph = builder.compile({ checkpointer: checkPointer });
    return compiledGraph;
}

export class InterviewAgent {
    private interview: Interview;
    private candidate: Candidate;
    private user: BasicUserDetails | null;
    private model: BaseChatModel;
    private threadId: string;

    static async create(opts: {
        interview: Interview;
        candidate: Candidate;
        user: BasicUserDetails | null;
        modelToUse: llmModels;
        config?: Omit<ConstructorParameters<typeof ChatGoogleGenerativeAI>[0], 'model'>,
    }) {
        await ensureGraphCompiled();
        return new InterviewAgent(opts.interview, opts.candidate, opts.user, opts.modelToUse, opts.config);
    }

    private constructor(
        interview: Interview,
        candidate: Candidate,
        user: BasicUserDetails | null,
        model: llmModels,
        config?: Omit<ConstructorParameters<typeof ChatGoogleGenerativeAI>[0], 'model'>,
    ) {
        this.interview = interview;
        this.candidate = candidate;
        this.user = user;
        this.model = createModel(model, config);
        this.threadId = candidate.id.toString();
    }

    async sendMessage(userInput?: string, audioUrl?: string, type?: MessageTypeEnum, audioDuration?: number) {
        const graph = await ensureGraphCompiled();
        const config = {
            configurable: {
                thread_id: this.threadId,
                context: {
                    interview: this.interview,
                    candidate: this.candidate,
                    user: this.user,
                    model: this.model,
                }
            },
        };
        const messages = [];
        let finalTextInput = userInput
        if (audioUrl && type == MessageTypeEnum.AUDIO) {
            finalTextInput = await transcribeAudio(audioUrl)
        }

        const humanMessage = new HumanMessage({
            content: finalTextInput,
        })
        if (type == MessageTypeEnum.AUDIO) {
            humanMessage.additional_kwargs = {
                audioUrl,
                audioDuration,
                type
            }
        }
        else {
            humanMessage.additional_kwargs = {
                type
            }
        }
        messages.push({
            id: crypto.randomUUID(),
            createdAt: new Date(),
            message: humanMessage,
        });

        const result = await graph.invoke(
            {
                messages: messages,
                shouldConvertToStructured: true,
                conversionAttempts: 0,
            },
            config
        );
        return result;
    }

    async getPersistedMessages(): Promise<MessageType[]> {
        const graph = await ensureGraphCompiled();
        try {
            const state = await graph.getState({
                configurable: { thread_id: this.threadId },
            });

            if (state && state.values && Array.isArray(state.values.messages)) {
                return filterEmptyAIMessages(state.values.messages);
            }
        } catch (error) {
            console.error("Error fetching persisted messages:", error);
        }
        return [];
    }

    async getInterviewStatus(): Promise<boolean> {
        const graph = await ensureGraphCompiled();
        try {
            const state = await graph.getState({
                configurable: { thread_id: this.threadId },
            });

            if (state && state.values && typeof state.values.isInterviewGoingOn === 'boolean') {
                return state.values.isInterviewGoingOn;
            }
        } catch (error) {
            console.error("Error fetching interview status:", error);
        }
        return true; // Default to true if status cannot be determined
    }

    static parseMessage(config: { includeToolCalls: boolean } = { includeToolCalls: false }, messages: Array<MessageType>) {
        return messages.reduce((result: Array<MessageType>, msg) => {
            if (msg.message instanceof AIMessage && ((msg.message.tool_calls?.length ?? 0) > 0)) {
                // if (config.includeToolCalls) {
                result.push(msg);
                // }
            } else if (msg.message instanceof ToolMessage) {
                if (config.includeToolCalls) {
                    result.push(msg);
                }
            } else {
                result.push(msg);
            }
            return result;
        }, []);
    }

    async getHistory(config: { includeToolCalls: boolean } = { includeToolCalls: false }) {
        const messages = await this.getPersistedMessages();
        const messageToInclude = InterviewAgent.parseMessage(config, messages);

        return messageToInclude.reduce((result: Array<any>, msg) => {
            const base = {
                id: msg.id,
                createdAt: msg.createdAt,
                role: msg.message._getType(),
                rowText: typeof msg.message.content === 'string' ? msg.message.content : msg.message.content[msg.message.content.length - 1]?.text,
                audioUrl: msg.message.additional_kwargs?.audioUrl,
                type: msg.message.additional_kwargs?.type,
                audioDuration: msg.message.additional_kwargs?.audioDuration,
            };
            result.push(base);
            return result;
        }, []);
    }

    async generateReport(): Promise<zod.infer<typeof interviewReportSchema>> {
        const systemInstruction = systemInstructionForGeneratingReport(this.interview, this.candidate);
        const schema = interviewReportSchema;
        const agent = createAgent({
            model: this.model,
            systemPrompt: systemInstruction,
            responseFormat: schema,
        });
        const checkpoint = await checkPointer.get({
            configurable: { thread_id: this.threadId }
        });
        const existingMessages: Array<any> = (checkpoint?.channel_values?.messages ?? []) as any;
        const messages = InterviewAgent.parseMessage({ includeToolCalls: false }, existingMessages);
        if (!messages.length) {
            return {
                scorePercentage: 0,
                detailsDescription: [],
                result: false,
                summaryReport: "No message to evaluate user",
            }
        }
        const response = await agent.invoke(
            {
                messages: messages.map(ele => ele.message),
            }
        );
        return response.structuredResponse;
    }

    async recreateLastMessage() {
        const graph = await ensureGraphCompiled();
        const config = {
            configurable: {
                thread_id: this.threadId,
                context: {
                    interview: this.interview,
                    candidate: this.candidate,
                    user: this.user,
                    model: this.model,
                },
            },
        };
        const result = await graph.invoke(
            {
                messages: [],
                shouldConvertToStructured: true,
                conversionAttempts: 0,
                correctionRequired: true,
            },
            config
        );
        return result;
    }

    async clearHistory() {
        throw new Error("Not implemented yet");
    }
}

export default InterviewAgent;