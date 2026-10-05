#!/usr/bin/env node

import express from 'express';
import shortenRouter from './routes/shorten.js';
import redirectRouter from './routes/redirect.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ============================================================
// MIDDLEWARES
// ============================================================

app.use(express.json({ limit: '100kb' }));

// Log
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
    });
    next();
});

// ============================================================
// ROUTES
// ============================================================

// Doc
app.get('/', (req, res) => {
    res.json({
        name: 'URL Shortener API',
        version: '1.0.0',
        baseUrl: BASE_URL,
        endpoints: {
            'POST /shorten': 'Create a short URL',
            'GET /shorten/:code': 'Get the original URL',
            'PUT /shorten/:code': 'Update the target URL',
            'DELETE /shorten/:code': 'Delete a short URL',
            'GET /shorten/:code/stats': 'Get stats',
            'GET /:code': 'Redirect to original URL (302)',
        },
        examples: {
            create: `curl -X POST ${BASE_URL}/shorten -H "Content-Type: application/json" -d '{"url":"https://example.com/long/url"}'`,
            retrieve: `curl ${BASE_URL}/shorten/abc123`,
            stats: `curl ${BASE_URL}/shorten/abc123/stats`,
            redirect: `Ouvre ${BASE_URL}/abc123 dans ton navigateur`,
        },
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// API
app.use('/shorten', shortenRouter);

// Redirection (catch-all — DOIT être après /shorten et /health)
app.use('/', redirectRouter);

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        message: 'Not found',
        path: req.originalUrl,
        hint: 'Create a short URL first with POST /shorten',
    });
});

// ============================================================
// ERREURS
// ============================================================

app.use(errorHandler);

// ============================================================
// DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 URL Shortener API running at ${BASE_URL}`);
    console.log(`   Try: ${BASE_URL}/`);
});