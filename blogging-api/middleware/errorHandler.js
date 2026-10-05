/**
 * Middleware Express : gestion d'erreurs globale.
 * DOIT être déclaré APRÈS les routes.
 */
export function errorHandler(err, req, res, next) {
    console.error('❌ Error:', err.message);

    // Erreur avec statusCode custom
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: message,
    });
}

/**
 * Helper : crée une erreur HTTP.
 */
export function httpError(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
}