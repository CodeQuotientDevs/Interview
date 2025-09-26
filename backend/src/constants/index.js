const modelString = {
    'user': 'user',
    'auth': 'auth',
    'interview': 'interview',
    'interviewAttempt': 'interviewAttempt',
    'interviewAttemptMessage': 'interviewAttemptMessage',
}

const loginType = {
    'user&pass': 1,
    'google': 2,
}

const sessionExpireTimeSeconds = 60 * 60;

const skillLevelNumberToString = {
    1: 'BEGINNER',
    2: 'INTERMEDIATE',
    3: 'EXPERT',
}

const roleNumberFromString = {
    admin: "0",
    user: "1",
    mentor: "2",
    subAdmin: "3",
};

const candidateInterviewAttemptStatus = {
    notStarted: 1,
    pending: 2,
    completed: 3,
}

module.exports = {
    loginType,
    modelString,
    roleNumberFromString,
    sessionExpireTimeSeconds,
    skillLevelNumberToString,
    candidateInterviewAttemptStatus,
};