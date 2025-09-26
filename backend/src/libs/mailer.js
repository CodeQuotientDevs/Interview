const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const ejs = require('ejs');
dayjs.extend(utc);
dayjs.extend(timezone);
const logger = require('./logger');

const mailContentBasePath = path.join(__dirname, '../../Views/mailTemplate');
const mailContents = {
    'interviewInvite': {
        content: fs.readFileSync(path.join(mailContentBasePath, './invite.ejs')).toString(),
        subject: (data, timeZone = 'asia/kolkata') => {
            return `Invitation for Interview | Starting at ${dayjs(data.startDate).tz(timeZone).format('DD/MM/YYYY HH:mm:ss')}`
        }
    }
}

let mailer = null;
if (process.env.EMAIL_API && process.env.EMAIL_SECRET && process.env.EMAIL_SENDER) {
    mailer = nodemailer.createTransport({
        service: 'Mailjet',
        auth: {
            user: process.env.EMAIL_API,
            pass: process.env.EMAIL_SECRET,
        },
        from: process.env.EMAIL_SENDER,
    });
}


/**
 * 
 * @param {{ name: string, email: string, jobTitle: string, startDate: Date, endDate?: Date, duration: number }} data 
 */
async function sendInvite(data) {
    logger.info(`Sending invite Email`);
    const subject = mailContents.interviewInvite.subject(data);
    data.currentHost = process.env.CURRENT_HOST;
    const content = ejs.render(mailContents.interviewInvite.content, data);
    await sendEmail(data.email, content, subject, true);
    return;
}

function sendEmail(to, message, subject, isHTML) {
    if (!mailer) {
        logger.info('Skipping emails as email cred are not provided');
        return false;
    }
    return mailer.sendMail({
        from: process.env.EMAIL_SENDER,
        to: to,
        [isHTML?'html':'text']: message,
        subject: subject,
    });
};

module.exports = {
    sendEmail,
    sendInvite,
};
