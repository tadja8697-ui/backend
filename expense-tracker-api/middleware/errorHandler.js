export function errorHandler(err, req, res, next) {
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (status >= 500) {
        console.error(`❌ [${status}] ${message}`, err.stack);
    } else {
        console.log(`⚠️  [${status}] ${message}`);
    }

    const body = { message };
    if (err.details) body.errors = err.details;

    res.status(status).json(body);
}

export function httpError(status, message, details = null) {
    const err = new Error(message);
    err.statusCode = status;
    if (details) err.details = details;
    return err;
}