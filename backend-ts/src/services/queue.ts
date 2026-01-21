import { Queue, Worker } from 'bullmq';
import { config } from '@services/redis';


export const inviteQueue = new Queue('invite-queue', {
    connection: config,
});

export const addInviteJob = async (data: any) => {
    return inviteQueue.add('process-invite', data);
};
