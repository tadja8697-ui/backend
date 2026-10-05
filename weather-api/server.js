#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

// Charge .env AVANT les imports qui en dépendent
loadEnvFile();

import { connectRedis } from './lib/redis.js';
import { getWeatherWithCache } from './lib/cache.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 2. MIDDLEWARES
// ============================================================

app.use(express.json());
app.use('/api', apiLimiter);

// Log simple des requêtes
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// ============================================================
// 3. ROUTES
// ============================================================

// GET /api/health → état du serveur
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// GET /api/weather/:city → météo avec cache
app.get('/api/weather/:city', async (req, res, next) => {
    try {
        const { city } = req.params;

        // Validation basique
        if (!city || city.trim().length < 2) {
            return res.status(400).json({
                error: 'Invalid city name.',
            });
        }

        const { data, cached } = await getWeatherWithCache(city);

        res.json({
            city,
            resolvedAddress: data.resolvedAddress,
            cached,
            data: {
                temp: data.temp,
                conditions: data.conditions,
                icon: data.icon,
                humidity: data.humidity,
                windspeed: data.windspeed,
                feelslike: data.feelslike,
            },
        });
    } catch (err) {
        next(err);   // Passe au middleware d'erreur
    }
});

// ============================================================
// 4. 404
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
    });
});

// ============================================================
// 5. GESTION D'ERREURS GLOBALE
// ============================================================

app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`❌ [${status}] ${message}`);

    res.status(status).json({
        error: message,
    });
});

// ============================================================
// 6. DÉMARRAGE
// ============================================================

async function start() {
    try {
        await connectRedis();
        console.log('✅ Redis connection established');

        app.listen(PORT, () => {
            console.log(`🚀 Weather API running at http://localhost:${PORT}`);
            console.log(`   Try: http://localhost:${PORT}/api/weather/Paris`);
        });
    } catch (err) {
        console.error('❌ Failed to start:', err.message);
        console.error('   ⚠️  Redis is required. Start it with:');
        console.error('   docker run -d --name redis -p 6379:6379 redis:alpine');
        process.exit(1);
    }
}

start();

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