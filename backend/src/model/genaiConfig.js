const { GoogleGenerativeAI } = require("@google/generative-ai");
const { dynamicEnv } = require("@/libs/dynamic-env");
const { logger } = require("@/libs");

class GeminiKeyRotate {

    /**
     * @type {Array<GoogleGenerativeAI>}
     */
    #genAis

    /**
     * @type {number}
     */
    #index = 0;
    constructor() { 
        dynamicEnv.on('envUpdated', this.#init.bind(this));
        this.#init();
    }
    #init() {
        logger.info('env change creating new genai from keys again')
        const apiKeys = (process.env.AI_MODEL_KEY ?? '').split(',').map(ele => ele.trim());
        if (!apiKeys.length) {
            throw new Error('Gemini key not provided');
        }
        this.#genAis = apiKeys.map(key => {
            const genAi = new GoogleGenerativeAI(key);
            return genAi;
        });
    }
    /**
     * 
     * @returns {GoogleGenerativeAI}
     */
    generateProxy() {
        const genAiModelRef = this;
        return new Proxy(genAiModelRef, {
            get: (target, p, receiver) => {
                genAiModelRef.#index =  (genAiModelRef.#index + 1) % this.#genAis.length;
                const currentGenAi = this.#genAis[genAiModelRef.#index];                
                logger.info(`Using genai of index ${this.#index}`);
                currentGenAi.getGenerativeModel.bind(currentGenAi);
                currentGenAi.getGenerativeModelFromCachedContent.bind(currentGenAi);
                if (p == 'getGenerativeModel') {
                    return currentGenAi.getGenerativeModel.bind(currentGenAi);
                }
                if (p === 'getGenerativeModelFromCachedContent') {
                    return currentGenAi.getGenerativeModelFromCachedContent.bind(currentGenAi);
                }
                return Reflect.get(currentGenAi, p, currentGenAi);
            },

            set: (target, p, newValue, receiver) => {
                genAiModelRef.#index =  (genAiModelRef.#index + 1) % this.#genAis.length;
                const currentGenAi = this.#genAis;                
                logger.info(`Using genai of index ${this.#index}`);
                return Reflect.set(currentGenAi, p, newValue, currentGenAi);
            }
        })
    }
}

const geminiRotate = new GeminiKeyRotate();

module.exports = geminiRotate.generateProxy();