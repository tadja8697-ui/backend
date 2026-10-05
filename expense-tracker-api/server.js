#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

loadEnvFile();

import authRouter from './routes/auth.js';
import expensesRouter from './routes/expenses.js';
import { errorHandler } from './middleware/errorHandler.js';
import { CATEGORIES } from './utils/categories.js';

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be set and at least 32 chars long.');
    process.exit(1);
}

// ============================================================
// MIDDLEWARES
// ============================================================

app.use(express.json({ limit: '1mb' }));

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
        name: 'Expense Tracker API',
        version: '1.0.0',
        categories: CATEGORIES,
        endpoints: {
            'POST /register': 'Create a new user',
            'POST /login': 'Authenticate and get a token',
            'POST /expenses': 'Create an expense (auth)',
            'GET /expenses': 'List expenses with filters (auth)',
            'GET /expenses/summary': 'Summary by category (auth)',
            'GET /expenses/:id': 'Get one expense (auth)',
            'PUT /expenses/:id': 'Update an expense (auth)',
            'DELETE /expenses/:id': 'Delete an expense (auth)',
        },
        filters: {
            period: 'week | month | 3months',
            startDate: 'YYYY-MM-DD (custom range)',
            endDate: 'YYYY-MM-DD (custom range)',
            category: CATEGORIES.join(' | '),
            minAmount: 'number',
            maxAmount: 'number',
            term: 'search in description',
            sort: 'date | amount | category',
            order: 'asc | desc',
            page: 'number (default 1)',
            limit: 'number (default 20, max 100)',
        },
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/', authRouter);
app.use('/expenses', expensesRouter);

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
    console.log(`🚀 Expense Tracker API running at http://localhost:${PORT}`);
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

        if (!process.env[key]) process.env[key] = value;
    }
}