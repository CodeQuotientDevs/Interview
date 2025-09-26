const dotenv = require('dotenv');
const fs = require('fs');
const { EventEmitter } = require('node:events');
const logger = require('./logger');
class DynamicEnv extends EventEmitter {
    #updateEnv(envPath) {
        dotenv.config({
            override: true,
            path: envPath
        });
        this.emit('envUpdated');

    }
    config(envPath) {
        const isFilePresent = fs.existsSync(envPath);
        if (!isFilePresent) {
            logger.info('.env file not found');
            return;
        }
        fs.watchFile(envPath, () => {
            this.#updateEnv();
        });
        this.#updateEnv();
    }
}

const dynamicEnv = new DynamicEnv();
module.exports = {
    dynamicEnv,
    config: dynamicEnv.config.bind(dynamicEnv),
}