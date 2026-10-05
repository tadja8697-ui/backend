#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

// Charge .env AVANT les imports
loadEnvFile();

import authRouter from './routes/auth.js';
import todosRouter from './routes/todos.js';
import { errorHandler } from './middleware/errorHandler.js';

// ============================================================
// CONFIGURATION
// ============================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Vérification critique
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be set and at least 32 chars long.');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
}

// ============================================================
// MIDDLEWARES
// ============================================================

app.use(express.json({ limit: '1mb' }));

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

app.get('/', (req, res) => {
    res.json({
        name: 'Todo API',
        version: '1.0.0',
        endpoints: {
            'POST /register': 'Create a new user',
            'POST /login': 'Authenticate and get a token',
            'POST /todos': 'Create a todo (auth required)',
            'GET /todos': 'List todos (auth, paginated)',
            'GET /todos/:id': 'Get one todo (auth)',
            'PUT /todos/:id': 'Update a todo (auth)',
            'DELETE /todos/:id': 'Delete a todo (auth)',
        },
        auth: 'Send "Authorization: Bearer <token>" header',
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/', authRouter);
app.use('/todos', todosRouter);

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
    console.log(`🚀 Todo API running at http://localhost:${PORT}`);
    console.log(`   Try: http://localhost:${PORT}/`);
});

// ============================================================
// HELPER : charger .env
// ============================================================

function loadEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;

        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}