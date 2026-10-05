#!/usr/bin/env node

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { convert, TYPES } from './utils/convert.js';
import { renderPage } from './utils/render.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 2. MIDDLEWARES
// ============================================================

// Parse les données de formulaire (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Sert les fichiers statiques du dossier public/
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// 3. ROUTES
// ============================================================

// GET / → redirige vers /length
app.get('/', (req, res) => {
    res.redirect('/length');
});

// GET /:type → affiche le formulaire
app.get('/:type', (req, res, next) => {
    const { type } = req.params;

    // Si ce n'est pas un type valide → 404
    if (!TYPES.includes(type)) {
        return next();
    }

    res.send(renderPage({ type }));
});

// POST /convert → traite la conversion
app.post('/convert', (req, res) => {
    const { type, value, from, to } = req.body;

    // Validation du type
    if (!TYPES.includes(type)) {
        return res.status(400).send('Invalid conversion type.');
    }

    // Effectuer la conversion
    const result = convert(type, value, from, to);

    // Rendre la page avec le résultat
    res.send(renderPage({
        type,
        result,
        formData: { value, from, to },
    }));
});

// 404
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404</title></head>
        <body style="font-family: system-ui; padding: 2rem;">
            <h1>404 — Page not found</h1>
            <p><a href="/">Go back home</a></p>
        </body>
        </html>
    `);
});

// ============================================================
// 4. DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`   Press Ctrl+C to stop.`);
});