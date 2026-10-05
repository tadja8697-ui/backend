import jwt from 'jsonwebtoken';
import { httpError } from './errorHandler.js';

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next(httpError(401, 'Unauthorized: missing token'));
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return next(httpError(401, 'Unauthorized: invalid token format'));
    }

    try {
        const payload = jwt.verify(parts[1], process.env.JWT_SECRET);
        req.user = { id: payload.userId, email: payload.email };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(httpError(401, 'Unauthorized: token expired'));
        }
        return next(httpError(401, 'Unauthorized: invalid token'));
    }
}