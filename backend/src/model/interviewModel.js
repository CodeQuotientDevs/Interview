const { skillLevelNumberToString } = require('../constants');
const genAI = require('./genaiConfig');

const { GenerativeModel, ChatSession, SchemaType } = require('@google/generative-ai');

/**
 * @type {import('@google/generative-ai').FunctionDeclaration}
 */
const currentServerTimeFunctionDeclaration = {
    name: 'currentServerTime',
    description: 'Get the current time of the server.',
}

const userReportSchema = {
    description: "Schema representing the response of a user's interview results, including their overall performance and detailed topic-wise report.",
    type: SchemaType.OBJECT,
    nullable: false,
    properties: {
        result: {
            type: SchemaType.BOOLEAN,
            description: "Indicates whether the user passed the interview. `true` means the user passed, `false` means the user did not pass.",
            nullable: false
        },
        scorePercentage: {
            type: SchemaType.NUMBER,
            description: "The overall percentage score of the user in the interview, represented as a decimal value between 0 and 100. For example, a score of 75 would indicate 75% success in the interview. It should be depend on weightage and topic wise score . by combining topic wise score with weightage final score should be calculated.",
            nullable: false,
        },
        summaryReport: {
            type: SchemaType.STRING,
            description: "Provide brief summery of user report in markdown format.",
            nullable: false,
        },
        detailsDescription: {
            type: SchemaType.ARRAY,
            description: "An array of objects that contains a detailed report of the user's performance on specific topics in the interview.",
            items: {
                type: SchemaType.OBJECT,
                description: "Each object in this array represents the performance report for a specific topic the user was assessed on during the interview.",
                properties: {
                    topic: {
                        type: SchemaType.STRING,
                        nullable: false,
                        description: "The name or title of the topic that the user was tested on. For example, 'Data Structures' or 'JavaScript Basics'.",
                    },
                    topicWeight: {
                        type: SchemaType.NUMBER,
                        nullable: false,
                        description: "The weight of this topic from overall interview."
                    },
                    score: {
                        type: SchemaType.NUMBER,
                        description: "The user's score for this specific topic, typically on a scale of 0 to 100. This reflects how well the user performed in this particular area.",
                        nullable: false,
                    },
                    detailedReport: {
                        type: SchemaType.STRING,
                        description: "A comprehensive report that provides insight into the user's strengths and weaknesses in the topic. This can include feedback on specific areas that were well-understood and areas that require improvement.",
                        nullable: false,
                    },
                    questionsAsked: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                question: {
                                    type: SchemaType.STRING,
                                    description: "Question asked to the user",
                                    nullable: false,
                                },
                                score: {
                                    type: SchemaType.NUMBER,
                                    description: "Score for this question (SCORE should be between 0 to 10) and strictly depend of answer of user. If user didnt attempt or skip the question score must be 0",
                                    nullable: false,
                                },
                                userAnswer: {
                                    type: SchemaType.STRING,
                                    description: "User answer in markdown format, if plain text then also provide in markdown format",
                                    nullable: false,
                                },
                                remarks: {
                                    type: SchemaType.STRING,
                                    description: "Your remarks for user answer",
                                    nullable: false,
                                },
                            }  
                        },
                        description: "Provide the question which were asked to this user of this topic, make sure to show all questions",
                    }
                },
                required: ["topic", "score"]  // Ensuring that every report contains at least the topic and score
            }
        }
    },
    required: ["result", "scorePercentage", "detailsDescription"]
};


const interviewModelAiSchema = {
    description: "Response schema of the reply",
    type: SchemaType.OBJECT,
    nullable: false,
    properties: {
        isInterviewGoingOn: {
            type: SchemaType.BOOLEAN,
            description: "Specify if the candidate's interview is currently going on or not.",
            nullable: false,
        },
        editorType: {
            type: SchemaType.STRING,
            enum: ['editor', 'inputBox'],
            description: "Respond with correct editorType: use 'editor' only for coding-related answers, otherwise use 'inputBox'.",
            nullable: false,
        },
        languagesAllowed: {
            type: SchemaType.ARRAY,
            description: "If editorType is editor then the languages allowed for user.",
            nullable: false,
            items: {
                type: SchemaType.OBJECT,
                description: "language obj",
                properties: {
                    "label": {
                        type: SchemaType.STRING,
                        description: "The label of the language",
                        nullable: false,
                    },
                    "value": {
                        type: SchemaType.STRING,
                        description: "The value of the language for monaco editor",
                        nullable: false,
                    }
                }
            }
        },
        message: {
            type: SchemaType.STRING,
            description: "Message to show to the candidate currently interviewing. You can also include mark down in this for better formatting.",
            nullable: false,
        },
        topic: {
            type: SchemaType.STRING,
            description: "Specify current topic discussing in the interview.",
            nullable: false,
        },
        timeLeftForThisInterviewToConclude: {
            type: SchemaType.NUMBER,
            description: "The time left for this interview to conclude automatically in minutes.",
            nullable: false,
        }
    },
    required: ['isInterviewGoingOn', 'editorType'],

}

module.exports = class InterviewAiModel {
    /**
     * @type { GenerativeModel }
     */
    #model

    /**
     * @type { ChatSession }
     */
    #chat

    /**
     * 
     * @param {string} modelToUse 
     * @param {{ history: Array<import('@google/generative-ai').Content>, useReportSchema?: boolean, systemInstructions?: string }} config 
     */
    constructor(modelToUse, config) {
        const systemInstruction = config.useReportSchema?undefined:this.generateSystemInstructionForChat(config.systemInstructions);
        this.#model = genAI.getGenerativeModel({
            model: modelToUse,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: config.useReportSchema? userReportSchema : interviewModelAiSchema,
            },
            systemInstruction: systemInstruction,
        });
        this.#chat = this.#model.startChat({
            history: config.history,
            systemInstruction: systemInstruction,
        });
    }

    /**
     *
     * @param {string} raw
     * @returns {string}
     */
    _sanitizeToJson(raw) {
        if (typeof raw !== "string") return "";
        let s = raw.replace(/```(?:\s*json)?/gi, "").replace(/```/g, "");
        s = s.replace(/^\uFEFF/, "");
        s = s.replace(/,\s*(?=[}\]])/g, "");
        return s.trim();
    }

    /**
     *
     * @param {string} input
     * @returns {string|null}
     */
    _extractFirstJsonObject(input) {
        const start = input.indexOf("{");
        if (start === -1) return null;

        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = start; i < input.length; i++) {
            const ch = input[i];
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === "\\") {
                escape = true;
                continue;
            }
            if (ch === '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;
            if (ch === "{") depth++;
            else if (ch === "}") {
                depth--;
                if (depth === 0) {
                    return input.slice(start, i + 1);
                }
            }
        }
        return null;
    }
    
    static parseAiResponse(input) {
        if (typeof input !== "string") throw new Error("Input must be a string.");
        const candidate = InterviewAiModel.extractFirstJsonObject(input) || InterviewAiModel.extractFencedBlock(input) || input;
        const normalized = InterviewAiModel.normalizeJsonText(candidate);
        try {
            return JSON.parse(normalized);
        } catch (err) {
            const preview = normalized.length > 300 ? normalized.slice(0, 300) + "..." : normalized;
            throw new Error("JSON parse failed. Preview:\n" + preview + "\nError: " + (err).message);
        }
    }

    static normalizeJsonText(raw) {
        raw = raw.replace(/^\uFEFF/, "");
        raw = raw.replace(/,\s*(?=[}\]])/g, "");
        return raw.trim();
    }

    static extractFencedBlock(input) {
        const fenceRe = /```(?:\s*\w+)?\s*([\s\S]*?)\s*```/m;
        const m = input.match(fenceRe);
        return m && m[1] ? m[1] : null;
    }

    static extractFirstJsonObject(input) {
        const start = input.indexOf("{");
        if (start === -1) return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = start; i < input.length; i++) {
            const ch = input[i];
            if (escape) { escape = false; continue; }
            if (ch === "\\") { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === "{") depth++;
            else if (ch === "}") {
                depth--;
                if (depth === 0) return input.slice(start, i + 1);
            }
        }
        return null;
    }

    /**
     * 
     * @param {import('@/app/v1/interview/data-access/interview.model').Interview } interview
     * @param {import('@/app/v1/candidate/data-access/candidate.model').Candidate} candidate
     * @param {import('@/app/v1/user/data-access/user.model').SingleUserModel } user
     * @param {Array<string>} previousQuestionAsked
     * @returns {string}
     */
    static generateStartingMessageForInterview(interview, candidate, user, previousQuestionAsked = []) {
        let result = 'You are going to interview a candidate based on the provided information, please be very professional and gentle with the candidate, you are expert in the provided skills.';
        // result += `You are interviewing candidate for job title: ${data.jobTitle}\n`;
        result += `Minimum duration of interview should not less than  ${interview.duration} minutes. Submit the interview when user submit the first question asked after minimum duration of interview`;
        result += `Maximum duration of interview should not exceed the ${interview.duration} minutes and give 5% buffer time.`
	    result += ' interview must conducted for minimum duration , ask questions to users until time ends dont stop before that.';
        result += `Key Skills to check: ${ Object.values( interview.difficulty ?? {} ).map(ele => ele.skill).join(', ') /*skills.map((ele) => ele.name).join(', ')*/}\n`;
        result += `\n\nCandidate details: \n`;
        if (user) {
            result += `Name: ${user.name}\n`;
            result += `Email: ${user.email}\n`;
        }
        result += `Year of experience: ${candidate.yearOfExperience}\n`;
        result += `UserDescription about the candidate: ${candidate.userSpecificDescription}\n`;
        result += `Skills of this candidate: `;
        (interview.difficulty ?? []).forEach(({ skill, difficulty: level, duration, weight }) => {
            result += `\t ${skill} has level: ${skillLevelNumberToString[level ?? 1] ?? skillLevelNumberToString[1]} weightage of this section is ${weight} out of overall 100% and minimum interaction time ${duration}\n`;
        });
	    result += 'do not consider weightage as number of question , it should be ratio of questions asked from user'
        result += 'If topic can have coding question then ask at least one coding question.';
        result += 'DO NOTE PICK ANY OTHER TOPIC THEN THIS.\n';
	    result += 'end interview with statement \'If you have any question feel free to reach us at info@codequotient.com\' '
        result += `Lets start by greeting please do not ask first question about coding directly and score accordingly.\n`;
        result += `If you feel like candidate is performing well then increase the difficulty level. While increasing difficulty level consider user experience = ${candidate.yearOfExperience} not go beyond that.\n`;
        result += `Please follow the the following instruction very strictly:\n`;
        result += `When you are asking coding question editorType should be editor and also ask user if you require code editor. If user rejects then do not open code editor.\n`
        result += 'Do not answer questions asked by user.\n'	
        result += 'You can use server time to calculate remaining time for interview.\n'
        result += `Current ServerTime: ${new Date().toISOString()}`
        result += interview.generalDescriptionForAi;
        result += `Do not asked question previously asked before or rephrase them to make question different.\n`
        result += `But you are allowed to ask again user specific questions.\n`
        result += `\n\nPreviously Asked Questions:\n`;
        previousQuestionAsked.forEach((question, index) => {
            result += `${index}. ${question}\n`;
        });
        return result;
    }

    /**
     * Send a message to the LLM, parse JSON responses once, and update history.
     *
     * @param {string} message
     * @param {boolean} stream
     * @param {{ isJSON?: boolean }} config
     * @param {boolean} retry
     * @returns {Promise<any>} chat object (with .parsed when parse succeeded)
     */
    async sendMessage(message, stream, config = { isJSON: true }, retry = true) {
        try {
            if (stream) {
                throw new Error("Not implemented yet");
            }
            const chat = await this.#chat.sendMessage(
                JSON.stringify({
                    message,
                    createdAt: new Date(),
                })
            );
            return chat;
        } catch (error) {
            console.error(error);
            if (retry) {
                try {
                    return await this.sendMessage(message, stream, config, false);
                } catch (e) {
                }
            }
            throw new Error(error?.message ?? String(error));
        }
    }


    async getHistory() {
        const history = await this.#chat.getHistory();
        history.map((ele) => {
            if (ele.role === 'ai' || ele.role === 'model') {
                ele.parts = ele.parts.map((txt) => {
                    let payload = txt;
                    try {
                        if (payload.text) {
                            payload.text = JSON.stringify(InterviewAiModel.parseAiResponse(payload.text));
                        }
                    } catch (error) {
                        console.error(error);
                    }
                    return payload;
                });
            }
            return ele;
        });
        return history;
    }

    /**
     * @param {string | undefined} systemInstruction
     * @returns { import('@google/generative-ai').Content }
     */
    generateSystemInstructionForChat(systemInstruction) {
        /** @type { import('@google/generative-ai').Content } */
        const content = {
            parts: [
                { text:  'You are going to interview a person, the input for user on behalf of CodeQuotient.'},
                { text:  'When starting interview always start with greeting user on behalf of CodeQuotient.'},
                { text:  `You will be provided input in json form { message: string, createdAt: Date }.`},
                { text:  `The createdAt will specify current server time, use this time for interview duration calculation.`},
                { text:  'When user ask question unrelated to the interview you can specify to react to info@codequotient.com for their unrelated questions.'},
                { text:  'User is allowed to ask how much time is left in this interview to conclude.' },
                { text:  'Always provide timeLeftForThisInterviewToConclude' },
                { text:  'If question require code editor make sure the editorType is editor.' },
                { text:  'Always provide topic from which this question belong to in response.' },
            ],
            role: 'system'
        }
        if (systemInstruction) {
            content.parts.push(...systemInstruction.split('\n').map(instruction => ({ text: instruction })));
        }
        return content;
    }

    getUserReport() {
        let message = 'From this interaction, give the detailed report of the user performance.\n';
        message += `If user left before answering all the question, then reduce their score and mention on detailed report.\n`;
        message += 'Score of the topic should be from 0 to 100.\n';
	    message += 'Do not include question not related to the interview, for example do you want to open code editor.'
        message += `Also provide the topic wise question asked by the user with score, and their answer and your remarks in details.\n`
        message += `Do not create your own answer do not change any of the answer provided by the user.\n`
        message += `Marking should be harsh.\n`;
        message += 'All questions which you asked should be marked not even a single question should be ignored from any topics weather user answered or not.\n'
        message += 'It should be depend on weightage and topic wise score. by combining topic wise score and weightage final score should be calculated.\n'
        message += 'In summary of the summaryReport always include how the score was calculated, example which topic was taken in consideration with their score.\n'
        message += 'Always include question wise score with your imporvement remarks.\n'
        return this.#chat.sendMessage(message);
    }
}
