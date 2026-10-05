/**
 * Retourne la date d'il y a N jours au format YYYY-MM-DD.
 * @param {number} days
 * @returns {string}
 */
function daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
}

/**
 * Aujourd'hui au format YYYY-MM-DD.
 */
export function today() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Résout une période en { startDate, endDate }.
 * @param {string} period - 'week' | 'month' | '3months'
 * @returns {{ startDate: string, endDate: string }}
 */
export function resolvePeriod(period) {
    const endDate = today();

    switch (period) {
        case 'week':
            return { startDate: daysAgo(7), endDate };
        case 'month':
            return { startDate: daysAgo(30), endDate };
        case '3months':
            return { startDate: daysAgo(90), endDate };
        default:
            return null;
    }
}

/**
 * Vérifie qu'une date est au format YYYY-MM-DD.
 */
export function isValidDate(str) {
    if (typeof str !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;

    const date = new Date(str);
    return !Number.isNaN(date.getTime());
}