import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import logger from '@libs/logger';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
};

const connection = {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
};

export const inviteQueue = new Queue('invite-queue', {
    connection,
});

export const addInviteJob = async (data: any) => {
    return inviteQueue.add('process-invite', data);
};
