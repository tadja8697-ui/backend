import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../middleware/errorHandler.js';

const router = express.Router();
const SALT_ROUNDS = 10;

function nowISO() {
    return new Date().toISOString();
}

function generateToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
    };
}

// POST /register
router.post('/register', validate(['name', 'email', 'password']), async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
        if (existing) return next(httpError(409, 'Email already registered.'));

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
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

        const token = generateToken(user);
        res.status(201).json({ token, user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

// POST /login
router.post('/login', validate(['email', 'password']), async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
        if (!user) return next(httpError(401, 'Invalid email or password.'));

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return next(httpError(401, 'Invalid email or password.'));

        const token = generateToken(user);
        res.json({ token, user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

export default router;