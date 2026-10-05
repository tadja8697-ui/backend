import express from 'express';
import db from '../db.js';
import { isValidShortCode } from '../lib/shortcode.js';

const router = express.Router();

/**
 * GET /:code — Rediriger vers l'URL originale.
 *
 * Utilise 302 (Temporary) pour compter chaque clic.
 * Si on utilisait 301, le navigateur cacherait et on perdrait les stats.
 */
router.get('/:code', (req, res, next) => {
    try {
        const { code } = req.params;

        if (!isValidShortCode(code)) {
            return next();   // 404 géré plus loin
        }

        const row = db.prepare('SELECT * FROM urls WHERE short_code = ?').get(code);

        if (!row) {
            return next();   // 404
        }

        // ---------- Incrémenter le compteur ----------
        db.prepare(`
            UPDATE urls
            SET access_count = access_count + 1
            WHERE short_code = ?
        `).run(code);

        // ---------- Enregistrer le clic ----------
        db.prepare(`
            INSERT INTO clicks (short_code, clicked_at, user_agent)
            VALUES (?, ?, ?)
        `).run(code, new Date().toISOString(), req.headers['user-agent'] || null);

        // ---------- Redirection 302 ----------
        res.redirect(302, row.url);
    } catch (err) {
        next(err);
    }
});

export default router;