import zod, { check, int, number } from "zod";
import redisConstant from '@root/constants/redis';
import redis from '@services/redis';
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
    systemInstructionConvertSimpleStringToStructuredOutput,
    systemInstructionForGeneratingReport,
    systemInstructionToDetectIntent,
    compressQuestionListSystemInstruction,
} from "./systemInstruction";
import { systemInstructionAnalyzeCandidateBehavior } from "./systemInstruction/behaviorAnalysis";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getServerTime } from "./tools/serverTime";
import createModel from "./models";
import { createAgent } from "langchain";

import { interviewParserSchema, interviewReportSchema, candidateBehaviorSchema, CandidateBehaviorType } from "./schema/interviewAgent";
import { logger } from "@root/libs";
import { systemInstructionValidateModelResponse } from "./systemInstruction/validation";
import { ModelResponseValidator } from "./schema/validator";


type MessageType = {
    id: string,
    createdAt: Date,
    message: BaseMessage,
    structuredResponse: Record<string, any>,
    toDelete?: boolean,
}

type Intent = {
    intent: 'answer' | 'clarify_question' | 'dont_know_concept' | 'end_interview' | 'off_topic';
    confidence: number;
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
    }),
    correctionRequired: Annotation<boolean>({
        reducer: (current, update) => update ?? current,
        default: () => false,
    }),
    detectCandidateIntent: Annotation<boolean>({
        reducer: (current, update) => update ?? current,
        default: () => true,
    }),
    candidateIntent: Annotation<Intent | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    CandidateBehaviorType: Annotation<CandidateBehaviorType | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    })
});


type InterviewStateType = typeof InterviewState.State;

let compiledGraph: any = null;

async function ensureGraphCompiled() {
    if (compiledGraph) return compiledGraph;
    const builder = new StateGraph(InterviewState)
        .addNode("askAndRespond", async (state: InterviewStateType, config: any) => {
            const ctx = config.configurable?.context ?? {};
            const { interview, candidate, user, model } = ctx;

            if (!model || typeof model.invoke !== "function") {
                throw new Error("runtime.context.model missing or invalid. Pass a model instance with invoke({ messages }).");
            }
            const questionListKey = redisConstant.getInterviewQuestions(interview.id.toString());
            const isPresentRedis = await redis.exists(questionListKey);
            let compressedQuestionList = "";
            if (!isPresentRedis) {
                let questionList = "";
                for (let diff of interview.difficulty) {
                    questionList += diff.skill + "\n" + diff.questionList + "\n\n";
                }
                logger.info('Compressing question list for interview id: ' + interview.id.toString());
                const compressQuestionListPrompt = compressQuestionListSystemInstruction + questionList
                const modelResponse = await model.invoke(compressQuestionListPrompt);
                compressedQuestionList = typeof modelResponse === 'string' ? modelResponse : modelResponse.content;
                await redis.set(questionListKey, compressedQuestionList);
                logger.info('Compressed question list stored in redis for interview id: ' + interview.id.toString());
            }
            else {
                logger.info('Found question list in redis for interview id: ' + interview.id.toString());
                compressedQuestionList = await redis.get(questionListKey) as string;
            }
            const systemPrompt = systemInstructionCurrentInterview(
                interview as Interview,
                candidate as Candidate,
                user as BasicUserDetails,
                compressedQuestionList,
                state.CandidateBehaviorType
            );
            let enhancedSystemPrompt = systemPrompt;

            const messagesToDelete: Array<MessageType> = [];

            const messagesToAdd = state.messages.map(ele => ele.message);
            if (state.correctionRequired) {
                for (let index = messagesToAdd.length - 1; index >= 0; index--) {
                    const message = messagesToAdd[index];
                    if (message instanceof HumanMessage) {
                        break;
                    }
                    messagesToAdd.pop();
                    const msg = state.messages.pop();
                    if (msg) {
                        messagesToDelete.push({
                            toDelete: true,
                            ...msg,
                        });
                    }

                }
            }

            let updates: any = {};

            const isFirstMessage = messagesToAdd.length == 1;
            if (isFirstMessage) {
                enhancedSystemPrompt += `\n\nIMPORTANT: This is the FIRST message. You MUST call get_server_time immediately to establish the interview start time.`;
            } else if (state.interviewStartTime) {
                enhancedSystemPrompt += `\n\nInterview Start Time: ${state.interviewStartTime} (timestamp in ms). Current message count: ${messagesToAdd.length}. Remember to call get_server_time to calculate elapsed time.`;
            }
            let messagesForModel: BaseMessage[] = [
                new SystemMessage(enhancedSystemPrompt),
                ...messagesToAdd,
            ];

            let modelResponse;
            const maxRetries = 6;
            let lastError: any;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    modelResponse = await model.invoke(messagesForModel, {
                        tools: [getServerTime],
                    });

                    if (!modelResponse) {
                        throw new Error("Model returned empty response");
                    }

                    // Success - break out of retry loop
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
                    let uniqueSuffix = crypto.randomUUID();
                    const waitTime = Math.pow(2, attempt - 1) * 1000;
                    let lastMessage = messagesForModel[messagesForModel.length - 1]
                    messagesForModel[messagesForModel.length - 1].content += `${lastMessage.content}\n\n${uniqueSuffix}`;
                    logger.info({
                        message: `Retrying model invocation in ${waitTime}ms`,
                        attempt: attempt + 1,
                        uniqueSuffix,
                        lastMessageContent: messagesForModel[messagesForModel.length - 1].content,
                    });
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            logger.info('Ai Response Came');
            const newAiMessage: MessageType = {
                id: crypto.randomUUID(),
                message: modelResponse,
                createdAt: new Date(),
                structuredResponse: {},
            };

            updates.messages = [newAiMessage, ...messagesToDelete];
            updates.latestAiResponse = newAiMessage;
            if (isFirstMessage && modelResponse.tool_calls && modelResponse.tool_calls.length > 0) {
                const timeCall = modelResponse.tool_calls.find((tc: any) => tc.name === 'get_server_time');
                if (timeCall) {
                    updates.interviewStartTime = Date.now();
                }
            }
            return {
                ...updates,
                correctionRequired: false,
            };
        })
        .addNode("validateModelResponse", async (state: InterviewStateType, config: any) => {
            const lastMessageWrapper = state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
            if (!lastMessageWrapper) {
                return;
            }
            const ctx = config?.configurable?.context ?? {};
            const { model, user } = ctx;
            const validatorAgent = createAgent({
                model,
                systemPrompt: systemInstructionValidateModelResponse(),
                responseFormat: ModelResponseValidator,
            });
            if (!lastMessageWrapper.message.text) {
                return {
                    correctionRequired: true,
                }
            }
            const response = await validatorAgent.invoke({
                messages: [new HumanMessage(lastMessageWrapper.message.text)],
            });
            if (!response.structuredResponse.valid) {
                logger.info({
                    message: "Response From AI not valid",
                    reason: response.structuredResponse.reason,
                    aiMessage: lastMessageWrapper.message.text,
                });
                return {
                    correctionRequired: true,
                }
            };
            logger.info({
                message: "Valid response came from model",
            });
            return {
                correctionRequired: false,
            };
        })
        .addNode("convertToStructuredResponse", async (state: InterviewStateType, config: any) => {
            const instruction = systemInstructionConvertSimpleStringToStructuredOutput();
            const ctx = config.configurable?.context ?? {};
            const { model, user } = ctx;

            if (!model || typeof model.invoke !== "function") {
                throw new Error("runtime.context.model missing or invalid. Pass a model instance with invoke({ messages }).");
            }

            const numberOfMessagesAdditionalRequired = Math.ceil(state.conversionAttempts * 25 * state.messages.length) / 100;
            const messagesToGive = InterviewAgent.parseMessage({ includeToolCalls: false }, state.messages.slice(state.messages.length - numberOfMessagesAdditionalRequired));
            const lastAIMessageWrapper = state.messages.slice().reverse().find(
                wrapper => wrapper.message instanceof AIMessage
            );
            if (!lastAIMessageWrapper) {
                return {};
            }
            const messages = [
                new SystemMessage(instruction),
                ...(messagesToGive.map(ele => ele.message)),
                new HumanMessage(`PARSE THIS MESSAGE CONTENT:\n${lastAIMessageWrapper.message.content ?? ""}`),
            ];
            const agent = createAgent({
                model: model,
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
                if (structuredData.isInterviewGoingOn === false) {
                    updatedMessage.message = new AIMessage(`Thank you for interviewing with us today, ${user.name}.\nWe truly appreciate the time you dedicated to this conversation.\nIt was a pleasure learning more about your experience.\nHave a wonderful day!`)
                }
                return {
                    messages: [updatedMessage],
                    latestAiResponse: updatedMessage,
                    conversionAttempts: state.conversionAttempts + 1,
                    candidateIntent: false,
                };

            } catch (error) {
                const updatedMessage: MessageType = {
                    id: lastAIMessageWrapper.id,
                    message: lastAIMessageWrapper.message,
                    createdAt: lastAIMessageWrapper.createdAt,
                    structuredResponse: {
                        __raw: error,
                        __error: "JSON parse failed"
                    },
                };
                return {
                    candidateIntent: false,
                    conversionAttempts: state.conversionAttempts + 1,
                    messages: [updatedMessage],
                };
            }
        })
        .addNode("analyzeCandidateBehavior", async (state: InterviewStateType, config: any) => {
            const ctx = config?.configurable?.context ?? {};
            const { model } = ctx;

            // Only analyze if we have substantive candidate responses
            const candidateMessages = state.messages
                .filter(msg => msg.message instanceof HumanMessage)
                .slice(-1); // Get last candidate message

            if (candidateMessages.length === 0) {
                return {};
            }

            const lastCandidateMessage = candidateMessages[0];
            const candidateResponse = lastCandidateMessage.message.content;

            if (candidateResponse == 'Lets start the interview' || candidateResponse == "Let's skip this question") {
                return null
            }

            // Skip analysis for minimal responses (too short)
            if (typeof candidateResponse === 'string' && candidateResponse.length < 15) {
                return null;
            }

            try {
                const behaviorAnalysisAgent = createAgent({
                    model,
                    systemPrompt: systemInstructionAnalyzeCandidateBehavior(state.CandidateBehaviorType || undefined),
                    responseFormat: candidateBehaviorSchema,
                });
                const behaviorResponse = await behaviorAnalysisAgent.invoke({
                    messages: [new HumanMessage(`\n\nCandidate Response to Analyze:\n"${candidateResponse}"`)],
                });

                // Extract the parsed content
                const behaviorData = behaviorResponse.structuredResponse;

                logger.info({
                    message: 'Candidate behavior analyzed',
                    intelligenceLevel: behaviorData.intelligenceLevel,
                    confidenceLevel: behaviorData.confidenceLevel,
                    reasoning: behaviorData.brief_reasoning,
                    hasPreviousContext: !!state.CandidateBehaviorType,
                });

                return {
                    CandidateBehaviorType: {
                        ...behaviorData,
                        lastUpdatedAt: new Date(),
                    },
                };
            } catch (error) {
                logger.error({
                    message: 'Error analyzing candidate behavior',
                    error,
                });
                return {};
            }
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
                structuredResponse: {},
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
                return "validate";
            },
            {
                tools: "executeTools",
                structured_conversion: "convertToStructuredResponse",
                end: END,
                validate: "validateModelResponse",
            }
        )
        .addEdge("validateModelResponse", "analyzeCandidateBehavior")
        .addEdge("analyzeCandidateBehavior", "convertToStructuredResponse")
        .addConditionalEdges("convertToStructuredResponse", (state: InterviewStateType) => {
            const lastMessageWrapper = state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
            if (!lastMessageWrapper?.structuredResponse?.confidence) {
                return "end";
            }
            if (state.conversionAttempts > 3) {
                return "end";
            }
            if (lastMessageWrapper?.structuredResponse?.confidence > 0.7) {
                return "end";
            }
            return "retry";
        }, {
            retry: "convertToStructuredResponse",
            end: END,
        })
        .addEdge(START, "askAndRespond")
        .addEdge("executeTools", "askAndRespond")
        .addEdge("validateModelResponse", "convertToStructuredResponse")
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
        temperature?: number;
    }) {
        await ensureGraphCompiled();
        return new InterviewAgent(opts.interview, opts.candidate, opts.user, opts.modelToUse, opts.temperature);
    }

    private constructor(
        interview: Interview,
        candidate: Candidate,
        user: BasicUserDetails | null,
        model: llmModels,
        temperature?: number,
    ) {
        this.interview = interview;
        this.candidate = candidate;
        this.user = user;
        this.model = createModel(model, {
            temperature: temperature || 1,
        });
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
                    detectCandidateIntent: true,
                    candidateIntent: null,
                }
            },
        };
        const messages = [];
        if (userInput) {
            const humanMessage = new HumanMessage(userInput);
            if (audioUrl && type) {
                humanMessage.additional_kwargs = { audioUrl, type, audioDuration };
            }
            messages.push({
                id: crypto.randomUUID(),
                createdAt: new Date(),
                message: humanMessage,
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

    static parseMessage(config: { includeToolCalls: boolean } = { includeToolCalls: false }, messages: Array<MessageType>) {
        return messages.reduce((result: Array<MessageType>, msg) => {
            if (msg.message instanceof AIMessage && ((msg.message.tool_calls?.length ?? 0) > 0)) {
                if (config.includeToolCalls) {
                    result.push(msg);
                }
            } else if (msg.message instanceof ToolMessage) {
                if (config.includeToolCalls) {
                    result.push(msg);
                }
            } else {
                if (msg.message instanceof AIMessage) {
                    if (msg.structuredResponse?.confidence) {
                        result.push(msg);
                    }
                } else {
                    result.push(msg);
                }
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
                rowText: typeof msg.message.content === 'string' ? msg.message.content : JSON.stringify(msg.message.content),
                parsedResponse: msg.structuredResponse,
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