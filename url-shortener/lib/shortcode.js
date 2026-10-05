import crypto from 'node:crypto';

// Alphabet Base62 : a-z, A-Z, 0-9
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Longueur par défaut
const DEFAULT_LENGTH = 7;

/**
 * Génère un short code aléatoire.
 * @param {number} length
 * @returns {string}
 */
export function generateShortCode(length = DEFAULT_LENGTH) {
    let code = '';

    // crypto.randomInt → meilleur que Math.random()
    for (let i = 0; i < length; i++) {
        const idx = crypto.randomInt(0, CHARS.length);
        code += CHARS[idx];
    }

    return code;
}

/**
 * Vérifie qu'un code est valide (alphanumérique, 4-20 chars).
 */
export function isValidShortCode(code) {
    return /^[a-zA-Z0-9]{4,20}$/.test(code);
}