const dayjs = require("dayjs");

const chatHistory = 'chatHistory';
const activeChatSet = 'activeChatsSet';
const completedInterview = 'completedInterview';
const questionAskedCache = 'questionAsked';
const getChatHistory = (interviewId) => {
    return `${chatHistory}:${interviewId}`
};

const getScoreForChat = () => {
    return dayjs().add(1, 'day').toDate().getTime();
};

module.exports = {
    chatHistory,
    activeChatSet,
    completedInterview,
    getChatHistory,
    getScoreForChat,
}