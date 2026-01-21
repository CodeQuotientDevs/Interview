import { Worker, Job } from 'bullmq';
import crypto from 'crypto';
import candidateService from '@app/v1/routes/candidate/domain/candidate.service';
import CandidateRepo from '@app/v1/routes/candidate/data-access/candidate.repository';
import { sendInvite, InviteData } from '@services/mailer';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import logger from '@libs/logger';
import CandidateRepository from '@app/v1/routes/candidate/data-access/candidate.models';
import { config }  from '@services/redis';
const candidateRepo = new CandidateRepo(CandidateRepository);
const candidateServices = new candidateService(candidateRepo);

const connection = config;
export const startInviteWorker = () => {
    const worker = new Worker('invite-queue', async (job: Job) => {
        logger.info(`Processing invite job ${job.id}`);
        const { candidateId, inviteData, attachments } = job.data;

        const candidate = await candidateServices.findById(candidateId);
        if (!candidate) {
            logger.error(`Candidate ${candidateId} not found`);
            return;
        }
        else {
            await candidateServices.updateOne({ id: candidateId }, {
                $set: { inviteStatus: "processing" }
            });
        }
        try {
            const attachmentContents: Record<string, string> = {};

            if (attachments && attachments.length > 0) {
                logger.info(`Processing ${attachments.length} attachments for candidate ${candidateId}`);

                const model = new ChatGoogleGenerativeAI({
                    model: "gemini-2.5-flash",
                    maxOutputTokens: 2048,
                    apiKey: process.env.GOOGLE_API_KEY,
                });

                for (const attachment of attachments) {
                    try {
                        if (attachment.content) {
                            attachmentContents[attachment.url] = attachment.content;
                            continue;
                        }
                        const extension = attachment.url.split('.').pop()?.toLowerCase();
                        let mimeType = 'application/pdf'; // Default to PDF
                        if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension || '')) {
                            mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
                        }

                        const message = new HumanMessage({
                            content: [
                                {
                                    type: "text",
                                    text: "Extract all text from this document. Provide only the extracted text content.",
                                },
                                {
                                    type: "media",
                                    fileUri: attachment.url,
                                    mimeType: mimeType,
                                } as any,
                            ],
                        });
                        let res;
                        const maxRetries = 3;

                        for (let attempt = 1; attempt <= maxRetries; attempt++) {
                            try {
                                res = await model.invoke([message]);

                                if (!res || !res.content) {
                                    throw new Error("Empty transcription response from model");
                                }
                                break;
                            } catch (error: any) {
                                if (attempt === maxRetries) {
                                    throw error;
                                }

                                const waitTime = Math.pow(2, attempt - 1) * 1000;
                                const uniqueSuffix = crypto.randomUUID();

                                if (Array.isArray(message.content)) {
                                    message.content = message.content.map((item: any) =>
                                        item.type === "text"
                                            ? {
                                                ...item,
                                                text: `${item.text}\n\nRetry-ID: ${uniqueSuffix}`,
                                            }
                                            : item
                                    );
                                }

                                logger.info({
                                    message: `Retrying attachment processing in ${waitTime}ms`,
                                    attempt: attempt + 1,
                                    retryId: uniqueSuffix,
                                });

                                await new Promise((resolve) => setTimeout(resolve, waitTime));
                            }
                        }

                        if (res && res.content) {
                            attachmentContents[attachment.url] = String(res.content);
                        }

                    } catch (err: any) {
                        logger.error(`Error processing attachment ${attachment.url}: ${err.message}`);
                        // Continue to next attachment even if one fails
                    }
                }
            }

            // Update candidate attachments with extracted content
            if (Object.keys(attachmentContents).length > 0) {

                if (candidate) {
                    const updatedAttachments = candidate.attachments.map((att: any) => {
                        const content = attachmentContents[att.url];
                        if (content) {
                            return { ...att, content };
                        }
                        return att;
                    });

                    await candidateServices.updateOne({ id: candidateId }, {
                        $set: { attachments: updatedAttachments }
                    });
                }
            }

            // Send Email
            await sendInvite(inviteData);

            // Update Status
            await candidateServices.updateOne({ id: candidateId }, {
                $set: { inviteStatus: 'sent' }
            });

            logger.info(`Invite job ${job.id} completed successfully`);

        } catch (error: any) {
            logger.error(`Error processing invite job ${job.id}: ${error.message}`);
            await candidateServices.updateOne({ id: candidateId }, {
                $set: { inviteStatus: 'failed' }
            });
            throw error;
        }

    }, { connection });

    worker.on('completed', (job) => {
        if (job) {
            logger.info(`Job ${job.id} has completed!`);
        }
    });

    worker.on('failed', (job, err) => {
        if (job) {
            logger.error(`Job ${job.id} has failed with ${err.message}`);
        }
    });
};
