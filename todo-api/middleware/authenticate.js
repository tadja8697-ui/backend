import jwt from 'jsonwebtoken';
import { httpError } from './errorHandler.js';

/**
 * Middleware : vérifie le JWT dans le header Authorization.
 * Ajoute req.user = { id, email } si valide.
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    // ---------- Vérifier la présence du header ----------
    if (!authHeader) {
        return next(httpError(401, 'Unauthorized: missing token'));
    }

    // ---------- Format : "Bearer <token>" ----------
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return next(httpError(401, 'Unauthorized: invalid token format'));
    }

    const token = parts[1];

    // ---------- Vérifier le token ----------
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Attacher les infos user à la requête
        req.user = {
            id: payload.userId,
            email: payload.email,
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(httpError(401, 'Unauthorized: token expired'));
        }
        return next(httpError(401, 'Unauthorized: invalid token'));
    }
}