import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../middleware/errorHandler.js';

const router = express.Router();

const SALT_ROUNDS = 10;

// ============================================================
// HELPERS
// ============================================================

function nowISO() {
    return new Date().toISOString();
}

/**
 * Génère un JWT pour un user.
 */
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        }
    );
}

/**
 * Renvoie la version publique d'un user (sans password).
 */
function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
    };
}

// ============================================================
// POST /register
// ============================================================

router.post('/register', validate(['name', 'email', 'password']), async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // ---------- Vérifier email unique ----------
        const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());

        if (existing) {
            return next(httpError(409, 'Email already registered.'));
        }

        // ---------- Hasher le mot de passe ----------
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // ---------- Insérer ----------
        const now = nowISO();

        const result = db.prepare(`
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        `).run(name, email.toLowerCase(), passwordHash, now);

        const user = {
            id: result.lastInsertRowid,
            name,
            email: email.toLowerCase(),
            created_at: now,
        };

        // ---------- Générer token ----------
        const token = generateToken(user);

        // 201 Created
        res.status(201).json({
            token,
            user: publicUser(user),
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// POST /login
// ============================================================

router.post('/login', validate(['email', 'password']), async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // ---------- Chercher user ----------
        const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());

        // ⚠️ Ne pas révéler si l'email existe ou non
        if (!user) {
            return next(httpError(401, 'Invalid email or password.'));
        }

        // ---------- Comparer password ----------
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return next(httpError(401, 'Invalid email or password.'));
        }

        // ---------- Générer token ----------
        const token = generateToken(user);

        res.json({
            token,
            user: publicUser(user),
        });
    } catch (err) {
        next(err);
    }
});

export default router;