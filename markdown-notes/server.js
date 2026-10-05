#!/usr/bin/env node

import express from 'express';
import notesRouter from './routes/notes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARES
// ============================================================

// JSON (pour /check-grammar et POST /notes en JSON)
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
// ROUTES
// ============================================================

app.get('/', (req, res) => {
    res.json({
        name: 'Markdown Notes API',
        version: '1.0.0',
        endpoints: {
            'POST /notes/check-grammar': 'Check grammar of a markdown text',
            'POST /notes': 'Create a note (upload file OR JSON)',
            'GET /notes': 'List all notes',
            'GET /notes/:id': 'Get a single note (JSON)',
            'GET /notes/:id/render': 'Render a note as HTML',
            'DELETE /notes/:id': 'Delete a note',
        },
        examples: {
            upload: 'curl -F "file=@note.md" http://localhost:3000/notes',
            json: 'curl -X POST http://localhost:3000/notes -H "Content-Type: application/json" -d \'{"title":"Test","content":"# Hello"}\'',
            render: 'curl http://localhost:3000/notes/{id}/render',
            renderHtml: 'curl "http://localhost:3000/notes/{id}/render?format=html"',
        },
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/notes', notesRouter);

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        message: 'Not found',
        path: req.originalUrl,
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
    console.log(`🚀 Markdown Notes API running at http://localhost:${PORT}`);
    console.log(`   Try: http://localhost:${PORT}/`);
});