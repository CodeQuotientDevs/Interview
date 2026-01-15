import { Request, Response, NextFunction } from "express";


import { TokenModel } from '../routes/auth/data-access/token.model';
import AuthService from '../routes/auth/domain/auth.service';
import AuthRepository from '../routes/auth/data-access/auth.repository';
import authModel from '../routes/auth/data-access/auth.models';

const authService = new AuthService(new AuthRepository(authModel));


export const checkIfLogin = async (req: Request, res: Response, next: NextFunction) => {
    let isLoggedIn = false;
    
    // Check for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const dbToken = await TokenModel.findOne({ token, isActive: true });
            if (dbToken) {
                const user = await authService.findOne({ id: dbToken.userId });
                if (user) {
                    if (!req.session) {
                        // @ts-ignore
                        req.session = {};
                    }
                    // @ts-ignore
                    req.session.userId = user.id;
                        // @ts-ignore
                    req.session.role = user.role; 
                        // @ts-ignore
                    req.session.email = user.email;
                        // @ts-ignore
                    req.session.displayname = user.name;
                    // @ts-ignore
                    req.session.orgId = user.orgId;

                    isLoggedIn = true;
                }
            }
        } catch (error) {
                console.error("DB Token Verification failed:", error);
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