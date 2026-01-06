import { Request, Response, NextFunction } from "express";


import jwt from 'jsonwebtoken';

const populateSession = (req: Request, decodedToken: any) => {
    if (!req.session) {
        // @ts-ignore
        req.session = {};
    }
    
    // Assuming the token payload matches what's needed in the session
    // Adjust mapping as necessary based on your token structure
    // @ts-ignore
    req.session.userId = decodedToken.userId || decodedToken.id || decodedToken._id;
    // Default role to 'user' if not provided
    // @ts-ignore
    req.session.role = decodedToken.role || 'user';
    
    // Copy other relevant fields if needed
    if(decodedToken.email) {
         // @ts-ignore
        req.session.email = decodedToken.email;
    }
     // @ts-ignore
    req.session.isExternalInterviewer = true;
}

export const checkIfLogin = (req: Request, res: Response, next: NextFunction) => {
    let isLoggedIn = false;
    
    // Check for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if(!process.env.JWT_SECRET) {
           throw new Error("JWT_SECRET is not set");
        }
        try {
            const secret = process.env.JWT_SECRET 
            const decoded = jwt.verify(token, secret);
            populateSession(req, decoded);
            isLoggedIn = true;
        } catch (error) {
            console.error("JWT Verification failed:", error);
            // Optionally continue to check session if token fails, but usually token failure means 401
        }
    }

    if (!isLoggedIn && "session" in req && typeof req.session === 'object' && req.session && "userId" in req.session && req.session.userId) {
        isLoggedIn = true;
    }
    if (!next) {
        return isLoggedIn;
    }
    if (isLoggedIn) {
        return next();
    }
    return res.status(401).json({
        error: 'Session Expired or Invalid Token',
    });
}

export const checkIfValidSource = (req: Request, res: Response, next: NextFunction) => {
    next();
}

export default {
    checkIfLogin,
    checkIfValidSource,
}