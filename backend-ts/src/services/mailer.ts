import nodemailer, { Transporter, SendMailOptions, SentMessageInfo } from "nodemailer";
import fs from "fs-extra";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import ejs from "ejs";

import logger from "@libs/logger";

dayjs.extend(utc);
dayjs.extend(timezone);

const mailContentBasePath = path.resolve(process.cwd(), "Views/mailTemplate");

export interface InviteData {
    name: string;
    email: string;
    jobTitle?: string;
    startDate: Date | string;
    endDate?: Date | string;
    duration: number;
    currentHost?: string;
    [key: string]: any;
}

interface MailContent {
    content: string;
    subject: (data: InviteData, timeZone?: string) => string;
}

const mailContents: Record<string, MailContent> = {
    interviewInvite: {
        content: fs.readFileSync(path.join(mailContentBasePath, "./invite.ejs")).toString(),
        subject: (data: InviteData, timeZone = "asia/kolkata") => {
            return `Invitation for Interview | Starting at ${dayjs(data.startDate).tz(timeZone).format(
                "DD/MM/YYYY HH:mm:ss"
            )}`;
        },
    },
};

let mailer: Transporter | null = null;

if (process.env.EMAIL_API && process.env.EMAIL_SECRET && process.env.EMAIL_SENDER) {
    mailer = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        auth: {
            user: process.env.EMAIL_API,
            pass: process.env.EMAIL_SECRET,
        },
        from: process.env.EMAIL_SENDER,
    });
}

export async function sendInvite(data: InviteData): Promise<void> {
    logger.info(`Sending invite Email`);
    const subject = mailContents.interviewInvite.subject(data);
    data.currentHost = process.env.CURRENT_HOST;
    const content = ejs.render(mailContents.interviewInvite.content, data);
    await sendEmail(data.email, content, subject, true);
    return;
}

export async function sendEmail(
    to: string,
    message: string,
    subject: string,
    isHTML = true
): Promise<SentMessageInfo | false> {
    if (!mailer) {
        logger.info("Skipping emails as email cred are not provided");
        return false;
    }

    const mailOptions: SendMailOptions = {
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER}>`,
        
        to,
        subject,
        ...(isHTML ? { html: message } : { text: message }),
    };

    return mailer.sendMail(mailOptions);
}

export default {
    sendEmail,
    sendInvite,
};
