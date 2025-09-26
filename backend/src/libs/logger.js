const { pino } = require('pino');
const path = require('path');
const argsMap = require('./argsParser');


const transport = pino.transport({
    targets: [
        {
            target: 'pino-roll',
            options: {
                file: path.join('../logs', `log`),
                dateFormat: 'yyyy-MM-dd-hh',
                frequency: 'daily',
                mkdir: true,
            },
            level: 'debug',
        },
        {
            target: 'pino/file',
            options: {
                destination: 1,
            },
            level: 'debug',
        }
    ]

});

const extraPort = {};
if (argsMap.get('port')) {
    extraPort.port = argsMap.get('port');
}

if (argsMap.get('worker')) {
    extraPort.worker = true;
}

const logger = pino(transport).child(extraPort);
module.exports = logger;
