/**
 * Middleware : bloque l'accès si l'utilisateur n'est pas admin.
 * Redirige vers /login.
 */
export function requireAuth(req, res, next) {
    if (req.session?.isAdmin) {
        return next();
    }
    res.redirect('/login');
}

/**
 * Vérifie le mot de passe admin.
 * ⚠️ En production : hasher le mot de passe (bcrypt).
 * @param {string} password
 * @returns {boolean}
 */
export function checkPassword(password) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        console.error('⚠️  ADMIN_PASSWORD manquant dans .env');
        return false;
    }
    return password === adminPassword;
}