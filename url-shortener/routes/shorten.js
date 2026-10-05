import express from 'express';
import db from '../db.js';
import { generateShortCode, isValidShortCode } from '../lib/shortcode.js';
import { validateUrl } from '../lib/validate.js';
import { httpError } from '../middleware/errorHandler.js';

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function nowISO() {
    return new Date().toISOString();
}

/**
 * Convertit une ligne SQL en objet API.
 */
function rowToUrl(row, includeAccessCount = false) {
    const base = {
        id: String(row.id),
        url: row.url,
        shortCode: row.short_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };

    if (includeAccessCount) {
        base.accessCount = row.access_count;
    }

    return base;
}

/**
 * Cherche une URL par son short code.
 */
function findByCode(code) {
    return db.prepare('SELECT * FROM urls WHERE short_code = ?').get(code);
}

// ============================================================
// POST /shorten — Créer
// ============================================================

router.post('/', (req, res, next) => {
    try {
        const { url } = req.body || {};

        // ---------- Validation ----------
        const validation = validateUrl(url);
        if (!validation.valid) {
            return next(httpError(400, validation.error));
        }

        const trimmedUrl = url.trim();
        const now = nowISO();

        // ---------- Génération du code avec retry ----------
        let shortCode = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        while (attempts < MAX_ATTEMPTS) {
            const candidate = generateShortCode();

            // Vérifier existence (via contrainte UNIQUE)
            const existing = findByCode(candidate);
            if (!existing) {
                shortCode = candidate;
                break;
            }

            attempts++;
        }

        if (!shortCode) {
            return next(httpError(500, 'Failed to generate a unique short code. Try again.'));
        }

        // ---------- Insertion ----------
        let result;
        try {
            result = db.prepare(`
                INSERT INTO urls (url, short_code, access_count, created_at, updated_at)
                VALUES (?, ?, 0, ?, ?)
            `).run(trimmedUrl, shortCode, now, now);
        } catch (err) {
            // Contrainte UNIQUE (race condition)
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return next(httpError(500, 'Short code collision. Please retry.'));
            }
            throw err;
        }

        const row = db.prepare('SELECT * FROM urls WHERE id = ?').get(result.lastInsertRowid);

        // 201 Created
        res.status(201).json(rowToUrl(row));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /shorten/:code/stats — Stats (AVANT /:code)
// ============================================================

router.get('/:code/stats', (req, res, next) => {
    try {
        const { code } = req.params;

        if (!isValidShortCode(code)) {
            return next(httpError(400, 'Invalid short code format.'));
        }

        const row = findByCode(code);
        if (!row) {
            return next(httpError(404, `Short code "${code}" not found.`));
        }

        // Stats détaillées
        const recentClicks = db.prepare(`
            SELECT clicked_at, user_agent
            FROM clicks
            WHERE short_code = ?
            ORDER BY clicked_at DESC
            LIMIT 10
        `).all(code);

        res.json({
            ...rowToUrl(row, true),
            recentClicks: recentClicks.map((c) => ({
                clickedAt: c.clicked_at,
                userAgent: c.user_agent,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /shorten/:code — Récupérer
// ============================================================

router.get('/:code', (req, res, next) => {
    try {
        const { code } = req.params;

        if (!isValidShortCode(code)) {
            return next(httpError(400, 'Invalid short code format.'));
        }

        const row = findByCode(code);
        if (!row) {
            return next(httpError(404, `Short code "${code}" not found.`));
        }

        res.json(rowToUrl(row));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// PUT /shorten/:code — Mettre à jour
// ============================================================

router.put('/:code', (req, res, next) => {
    try {
        const { code } = req.params;
        const { url } = req.body || {};

        if (!isValidShortCode(code)) {
            return next(httpError(400, 'Invalid short code format.'));
        }

        const validation = validateUrl(url);
        if (!validation.valid) {
            return next(httpError(400, validation.error));
        }

        const row = findByCode(code);
        if (!row) {
            return next(httpError(404, `Short code "${code}" not found.`));
        }

        const now = nowISO();

        db.prepare(`
            UPDATE urls
            SET url = ?, updated_at = ?
            WHERE short_code = ?
        `).run(url.trim(), now, code);

        const updated = findByCode(code);
        res.json(rowToUrl(updated));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// DELETE /shorten/:code — Supprimer
// ============================================================

router.delete('/:code', (req, res, next) => {
    try {
        const { code } = req.params;

        if (!isValidShortCode(code)) {
            return next(httpError(400, 'Invalid short code format.'));
        }

        const result = db.prepare('DELETE FROM urls WHERE short_code = ?').run(code);

        if (result.changes === 0) {
            return next(httpError(404, `Short code "${code}" not found.`));
        }

        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;