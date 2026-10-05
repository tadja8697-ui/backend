#!/usr/bin/env node

import 'node:process';
import express from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// Charger les variables d'env depuis .env (sans dotenv pour rester simple)
loadEnvFile();

import {
    getAllArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
} from './utils/storage.js';

import { requireAuth, checkPassword } from './utils/auth.js';

import {
    renderHome,
    renderArticle,
    renderAdmin,
    renderNewForm,
    renderEditForm,
    renderLogin,
} from './utils/render.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 2. MIDDLEWARES
// ============================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'insecure-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,   // 24h
    },
}));

// ============================================================
// 3. ROUTES PUBLIQUES
// ============================================================

// GET / → liste des articles
app.get('/', (req, res) => {
    const articles = getAllArticles();
    res.send(renderHome(articles, !!req.session.isAdmin));
});

// GET /article/:id → voir un article
app.get('/article/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).send('Invalid article ID.');

    const article = getArticle(id);
    if (!article) return res.status(404).send('Article not found.');

    res.send(renderArticle(article, !!req.session.isAdmin));
});

// ============================================================
// 4. AUTH
// ============================================================

// GET /login → formulaire
app.get('/login', (req, res) => {
    // Déjà connecté → redirect
    if (req.session.isAdmin) return res.redirect('/admin');
    res.send(renderLogin());
});

// POST /login → vérification
app.post('/login', (req, res) => {
    const { password } = req.body;

    if (checkPassword(password)) {
        req.session.isAdmin = true;
        return res.redirect('/admin');
    }

    res.status(401).send(renderLogin({ error: 'Invalid password.' }));
});

// POST /logout → déconnexion
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ============================================================
// 5. ROUTES ADMIN (protégées)
// ============================================================

// GET /admin → dashboard
app.get('/admin', requireAuth, (req, res) => {
    const articles = getAllArticles();
    res.send(renderAdmin(articles));
});

// GET /new → formulaire de création
app.get('/new', requireAuth, (req, res) => {
    res.send(renderNewForm());
});

// POST /new → traiter la création
app.post('/new', requireAuth, (req, res) => {
    const { title, date, content } = req.body;

    if (!title?.trim() || !date?.trim() || !content?.trim()) {
        return res.status(400).send('All fields are required.');
    }

    createArticle({
        title: title.trim(),
        date: date.trim(),
        content: content.trim(),
    });

    res.redirect('/admin');
});

// GET /edit/:id → formulaire d'édition
app.get('/edit/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).send('Invalid article ID.');

    const article = getArticle(id);
    if (!article) return res.status(404).send('Article not found.');

    res.send(renderEditForm(article));
});

// POST /edit/:id → traiter la mise à jour
app.post('/edit/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).send('Invalid article ID.');

    const { title, date, content } = req.body;

    if (!title?.trim() || !date?.trim() || !content?.trim()) {
        return res.status(400).send('All fields are required.');
    }

    const updated = updateArticle(id, {
        title: title.trim(),
        date: date.trim(),
        content: content.trim(),
    });

    if (!updated) return res.status(404).send('Article not found.');

    res.redirect('/admin');
});

// POST /delete/:id → supprimer
app.post('/delete/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).send('Invalid article ID.');

    deleteArticle(id);
    res.redirect('/admin');
});

// ============================================================
// 6. 404
// ============================================================

app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404</title><link rel="stylesheet" href="/style.css"></head>
        <body>
            <div class="page">
                <h1 class="page-title">404 — Page not found</h1>
                <a href="/" class="btn btn-secondary">Go home</a>
            </div>
        </body>
        </html>
    `);
});

// ============================================================
// 7. DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 Blog running at http://localhost:${PORT}`);
    console.log(`   Admin login: http://localhost:${PORT}/login`);
});

// ============================================================
// HELPER : charger .env sans dépendance
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