export function errorHandler(err, req, res, next) {
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (status >= 500) {
        console.error(`❌ [${status}] ${message}`, err.stack);
    } else {
        console.log(`⚠️  [${status}] ${message}`);
    }

    res.status(status).json({ message });
}

export function httpError(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
}