/**
 * Vérifie qu'une URL est valide et http(s).
 * @param {string} str
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUrl(str) {
    if (!str || typeof str !== 'string') {
        return { valid: false, error: '"url" is required and must be a string.' };
    }

    const trimmed = str.trim();

    if (trimmed.length < 8) {
        return { valid: false, error: 'URL is too short.' };
    }

    if (trimmed.length > 2048) {
        return { valid: false, error: 'URL is too long (max 2048 chars).' };
    }

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { valid: false, error: 'Invalid URL format.' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'URL must use HTTP or HTTPS.' };
    }

    return { valid: true };
}