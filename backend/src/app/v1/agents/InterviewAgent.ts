import Zod from "zod"
import { createModel } from "./models"
import { getServerTime } from "./tools"
import { AIMessage, createAgent, SystemMessage } from "langchain"
import { Interview } from "@app/v1/routes/interview/data-access/interview.model"
import { Candidate } from "@app/v1/routes/candidate/data-access/candidate.model"
import { systemInstructionCurrentInterview, systemInstructionConvertSimpleStringToStructuredOutput } from "./systemInstruction"
import { interviewParserSchema } from "./schema/interviewAgent"
import { BaseMessage, HumanMessage } from "@langchain/core/messages"
const { ConversationChain } = require('langchain/chains');

export class InterviewAgent {
    static generateStartingMessageForInterview(interviewObj: any, candidateObj: any, userObj: any, previouslyAskedQuestions: any) {
        throw new Error("Method not implemented.")
    }
    getHistory() {
        throw new Error("Method not implemented.")
    }
    static parseAiResponse(arg0: any) {
        throw new Error("Method not implemented.")
    }
    #model;
    #agent;
    
    constructor (modelToUse: llmModels,  interview: Interview, candidate: Candidate, userDetails: BasicUserDetails) {
        this.#model = createModel(modelToUse);
        this.#agent = this.createInterviewAgent(interview, candidate, userDetails);
    }

    createStructuredResponse(systemInstruction: string, schema: Zod.ZodType) {
        
        return createAgent({
            model: this.#model,
            tools: [getServerTime],
            systemPrompt: systemInstruction,
        });
    }

    createInterviewAgent(interview: Interview, candidate: Candidate, userDetails: BasicUserDetails) {
        const modelToUse = this.#model;
        const systemInstruction = systemInstructionCurrentInterview(interview, candidate, userDetails);
        return createAgent({
            model: modelToUse,
            systemPrompt: systemInstruction,
            tools: [getServerTime]
        });
    }

    async sendMessage(message: string) {
        const stream = await this.#agent.stream({
            messages: [new HumanMessage(message)]
        }, {
            streamMode: "messages",
        });
        return stream;
    }

    async getStructuredOutput(message: string, history: Array<BaseMessage>) {
        const instruction = systemInstructionConvertSimpleStringToStructuredOutput()
        const model = this.createStructuredResponse(instruction, interviewParserSchema);
        const messages = [ ...history, new AIMessage(message), ];
        const finalMessage = await model.invoke({
            messages,
        });
        return finalMessage
    }


}

export default InterviewAgent;