import pino from 'pino'
import path from 'path'
import argsMap from './argsParser';

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

const extraPort: Record<string, unknown> = {};
if (argsMap.get('port')) {
    extraPort.port = argsMap.get('port');
}

if (argsMap.get('worker')) {
    extraPort.worker = true;
}

export const logger = pino(transport).child(extraPort);
export default logger;
