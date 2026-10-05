import rateLimit from 'express-rate-limit';

/**
 * Limite les requêtes par IP.
 * Par défaut : 30 requêtes / minute.
 */
export const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
    standardHeaders: true,    // Envoie les headers RateLimit-*
    legacyHeaders: false,     // Désactive X-RateLimit-*
    message: {
        error: 'Too many requests',
        message: 'Please slow down. Try again in a minute.',
    },
});