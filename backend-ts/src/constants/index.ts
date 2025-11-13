export const modelString = {
    'user': 'user',
    'auth': 'auth',
    'interview': 'interview',
    'interviewAttempt': 'interviewAttempt',
    'interviewAttemptMessage': 'interviewAttemptMessage',
}

export const loginType = {
    'user&pass': 1,
    'google': 2,
}

export const sessionExpireTimeSeconds = 60 * 60;

export const skillLevelNumberToString = {
    1: 'BEGINNER',
    2: 'INTERMEDIATE',
    3: 'EXPERT',
} as Record<number, string>

export const roleNumberFromString = {
    admin: "0",
    user: "1",
    mentor: "2",
    subAdmin: "3",
};

export const candidateInterviewAttemptStatus = {
    notStarted: 1,
    pending: 2,
    completed: 3,
}

export default {
    loginType,
    modelString,
    roleNumberFromString,
    sessionExpireTimeSeconds,
    skillLevelNumberToString,
    candidateInterviewAttemptStatus,
};