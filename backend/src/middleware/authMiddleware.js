
const checkIfLogin = (req, res, next) => {
    const isLoggedIn = (req?.session?.userId)?true:false
    if (!next) {
        return isLoggedIn;
    }
    if (isLoggedIn) {
        return next();
    }
    return res.status(401).json({
        error: 'Session Expired',
    });
}

const checkIfValidSource = (req, res, next) => {
    next();
}

module.exports = {
    checkIfLogin,
    checkIfValidSource,
}