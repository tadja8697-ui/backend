#!/usr/bin/env node

import express from 'express';
import postsRouter from './routes/posts.js';
import { errorHandler } from './middleware/errorHandler.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 2. MIDDLEWARES
// ============================================================

app.use(express.json({ limit: '1mb' }));

// Log des requêtes
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
    });
    next();
});

// ============================================================
// 3. ROUTES
// ============================================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Routes /posts
app.use('/posts', postsRouter);

// ============================================================
// 4. 404
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        hint: 'Try GET /posts',
    });
});

// ============================================================
// 5. GESTION D'ERREURS
// ============================================================

app.use(errorHandler);

// ============================================================
// 6. DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 Blogging API running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Posts:  http://localhost:${PORT}/posts`);
});