import { Request, Response, NextFunction } from "express";


export const checkIfLogin = (req: Request, res: Response, next: NextFunction) => {
    let isLoggedIn = false;
    if ("session" in req && typeof req.session === 'object' && req.session && "userId" in req.session && req.session.userId) {
        isLoggedIn = true;
    }
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

export const checkIfValidSource = (req: Request, res: Response, next: NextFunction) => {
    next();
}

export default {
    checkIfLogin,
    checkIfValidSource,
}