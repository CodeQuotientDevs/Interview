import dotenv from 'dotenv';
import fs from 'fs';
import EventEmitter from 'node:stream';
import logger from './logger';
import path from 'node:path';

class DynamicEnv extends EventEmitter {
    #updateEnv(envPath: string) {
        dotenv.config({
            override: true,
            path: envPath
        });
        this.emit('envUpdated');

    }
    config(envPath: string) {
        const isFilePresent = fs.existsSync(envPath);
        if (!isFilePresent) {
            logger.info('.env file not found');
            return;
        }
        fs.watchFile(envPath, () => {
            this.#updateEnv(envPath);
        });
        this.#updateEnv(envPath);
    }
}

export const dynamicEnv = new DynamicEnv();
export const config = dynamicEnv.config.bind(dynamicEnv);
const envPath = path.resolve(process.cwd(), ".env");
config(envPath);
export default {
    dynamicEnv,
    config
}
