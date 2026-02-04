import dayjs from 'dayjs';

const chatHistory = 'chatHistory';
const activeChatSet = 'activeChatsSet';
const completedInterview = 'completedInterview';
const questionAskedCache = 'questionAsked';

const getChatHistory = (interviewId: string) => {
    return `${chatHistory}:${interviewId}`;
}
const getInterviewQuestions: (interviewId: string) => string = (interviewId) => {
    return `interviewQuestions:${interviewId}`;
}

const getScoreForChat = () => {
    return dayjs().add(1, 'day').toDate().getTime();
}

export default {
    chatHistory,
    activeChatSet,
    getChatHistory,
    getScoreForChat,
    completedInterview,
    getInterviewQuestions
}