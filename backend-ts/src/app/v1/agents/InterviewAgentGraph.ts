import zod, { check } from "zod";
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
    systemInstructionConvertSimpleStringToStructuredOutput,
} from "./systemInstruction";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getServerTime } from "./tools/serverTime";
import createModel from "./models";
import { createAgent } from "langchain";

import { interviewParserSchema, interviewReportSchema } from "./schema/interviewAgent";
import { logger } from "@root/libs";


type MessageType = {
    id: string,
    createdAt: Date,
    message: BaseMessage,
    structuredResponse: Record<string, any>,
}

const InterviewState = Annotation.Root({
    messages: Annotation<MessageType[]>({
        reducer: (current, update) => {
            const updateIds = new Set(update.map(msg => msg.id));
            const filteredCurrent = current.filter(msg => !updateIds.has(msg.id));
            return filteredCurrent.concat(update);
        },
        default: () => [],
    }),
    latestAiResponse: Annotation<MessageType | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    shouldConvertToStructured: Annotation<boolean>({
        reducer: (current, update) => update ?? current,
        default: () => true,
    }),
    conversionAttempts: Annotation<number>({
        reducer: (current, update) => update ?? current,
        default: () => 0,
    }),
    interviewStartTime: Annotation<Date>({
        reducer: (current, update) => update ?? current,
        default: () => new Date(),
    })
});

type InterviewStateType = typeof InterviewState.State;

let compiledGraph: any = null;

async function ensureGraphCompiled() {
    if (compiledGraph) return compiledGraph;
    const builder = new StateGraph(InterviewState)
        .addNode("askAndRespond", async (state: InterviewStateType, config: any) => {
            const ctx = config.configurable?.context ?? {};
            const { interview, candidate, user, model, messages } = ctx;

            if (!model || typeof model.invoke !== "function") {
                throw new Error("runtime.context.model missing or invalid. Pass a model instance with invoke({ messages }).");
            }
            const systemPrompt = systemInstructionCurrentInterview(
                interview as Interview,
                candidate as Candidate,
                user as BasicUserDetails
            );
            let enhancedSystemPrompt = systemPrompt;
            const isFirstMessage = state.messages.length == 1;
            if (isFirstMessage) {
                enhancedSystemPrompt += `\n\nIMPORTANT: This is the FIRST message. You MUST call get_server_time immediately to establish the interview start time.`;
            } else if (state.interviewStartTime) {
                enhancedSystemPrompt += `\n\nInterview Start Time: ${state.interviewStartTime} (timestamp in ms). Current message count: ${state.messages.length}. Remember to call get_server_time to calculate elapsed time.`;
            }

            const messagesForModel: BaseMessage[] = [
                new SystemMessage(enhancedSystemPrompt),
                ...state.messages.map(ele => ele.message),
            ];

            const modelResponse = await model.invoke(messagesForModel, {
                tools: [getServerTime],
            });

            const newAiMessage: MessageType = {
                id: crypto.randomUUID(),
                message: modelResponse,
                createdAt: new Date(),
                structuredResponse: {},
            };
            let updates: any = {
                messages: [newAiMessage],
                latestAiResponse: newAiMessage,
            };

            if (isFirstMessage && modelResponse.tool_calls && modelResponse.tool_calls.length > 0) {
                const timeCall = modelResponse.tool_calls.find((tc: any) => tc.name === 'get_server_time');
                if (timeCall) {
                    updates.interviewStartTime = Date.now();
                }
            }
            return updates;
        })
        .addNode("convertToStructuredResponse", async (state: InterviewStateType, config: any) => {
            const instruction = systemInstructionConvertSimpleStringToStructuredOutput();
            const ctx = config.configurable?.context ?? {};
            const { model } = ctx;

            if (!model || typeof model.invoke !== "function") {
                throw new Error("runtime.context.model missing or invalid. Pass a model instance with invoke({ messages }).");
            }
            
            const lastAIMessageWrapper = state.messages.slice().reverse().find(
                wrapper => wrapper.message instanceof AIMessage
            );

            if (!lastAIMessageWrapper) {
                return { messages: [] };
            }
            
            const messages = [
                new SystemMessage(instruction),
                new HumanMessage(`PARSE THIS MESSAGE CONTENT:\n${lastAIMessageWrapper.message.content ?? ""}`),
            ];

            const agent = createAgent({
                model,
                responseFormat: interviewParserSchema,
                tools: [],
                
            });
            const response = await agent.invoke({
                messages: messages,
            });
            const structuredData = response.structuredResponse;
            try {
                const updatedMessage: MessageType = {
                    id: lastAIMessageWrapper.id,
                    createdAt: lastAIMessageWrapper.createdAt,
                    message: lastAIMessageWrapper.message,
                    structuredResponse: structuredData,
                };
                
                return {
                    messages: [updatedMessage],
                    latestAiResponse: updatedMessage,
                };

            } catch (error) {
                const updatedMessage: MessageType = {
                    id: lastAIMessageWrapper.id,
                    message: lastAIMessageWrapper.message,
                    createdAt: lastAIMessageWrapper.createdAt,
                    structuredResponse: { 
                        __raw: error, 
                        __error: "JSON parse failed" 
                    }
                };
                return {
                    messages: [updatedMessage],
                };
            }
        })
        .addNode("executeTools", async (state: InterviewStateType) => {
            const lastMessageWrapper = state.messages[state.messages.length - 1];
            if (!lastMessageWrapper) {
                return { messages: [] };
            }
            const lastMessage = lastMessageWrapper.message;
            if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
                return { messages: [] };
            }
            const toolMessages: ToolMessage[] = [];
            for (const toolCall of lastMessage.tool_calls) {
                try {
                    let result: any;
                    switch (toolCall.name) {
                        case "get_server_time":
                            result = await getServerTime.invoke({
                                args: {},
                                name: "get_server_time",
                            });
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
                structuredResponse: {}
            }));

            return { messages: newToolMessages };
        })
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
                if (state.shouldConvertToStructured) {
                    return "structured_conversion"
                }
                return "end";
            },
            {
                tools: "executeTools",
                structured_conversion: "convertToStructuredResponse",
                end: END,
            }
        )
        .addEdge(START, "askAndRespond")
        .addEdge("executeTools", "askAndRespond")
        .addEdge("convertToStructuredResponse", END);

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
    }) {
        await ensureGraphCompiled();
        return new InterviewAgent(opts.interview, opts.candidate, opts.user, opts.modelToUse);
    }

    private constructor(
        interview: Interview,
        candidate: Candidate,
        user: BasicUserDetails | null,
        model: llmModels
    ) {
        this.interview = interview;
        this.candidate = candidate;
        this.user = user;
        this.model = createModel(model);
        this.threadId = candidate.id.toString();
    }

    async sendMessage(userInput?: string) {
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
        const messages = [];
        if (userInput) {
            messages.push({
                id: crypto.randomUUID(),
                createdAt: new Date(),
                message: new HumanMessage(userInput),
            });
        }
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
                return state.values.messages;
            }
        } catch (error) {
            console.error("Error fetching persisted messages:", error);
        }
        return [];
    }

    async getHistory(config: { includeToolCalls: boolean } = { includeToolCalls: false }) {
        const messages = await this.getPersistedMessages();
        return messages.reduce((result: Array<any>, msg) => {
            const base = {
                id: msg.id,
                createdAt: msg.createdAt,
                role: msg.message._getType(),
                rowText: typeof msg.message.content === 'string' ? msg.message.content : JSON.stringify(msg.message.content),
                parsedResponse: msg.structuredResponse,
            };

            if (msg.message instanceof AIMessage && ((msg.message.tool_calls?.length ?? 0) > 0)) {
                if (config.includeToolCalls) {
                    result.push(
                        { ...base, toolCalls: msg.message.tool_calls }
                    );
                }
            } else if (msg.message instanceof ToolMessage) {
                if (config.includeToolCalls) {
                    result.push(base);
                }
            } else {
                result.push(base);
            }
            return result;
        }, []);
    }

    async generateReport(): Promise<zod.infer<typeof interviewReportSchema>> {
        const systemInstruction = '';
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
        if (!existingMessages.length) {
            return {
                scorePercentage: 0,
                detailsDescription: [],
                result: false,
                summaryReport: "No message to evaluate user",
            }
        }
        const response = await agent.invoke(
            {
                messages: existingMessages.map(ele => ele.message),
            }
        );
        logger.info(response);
        return response.structuredResponse;
    }

    async clearHistory() {
        throw new Error("Not implemented yet");
    }
}

export default InterviewAgent;