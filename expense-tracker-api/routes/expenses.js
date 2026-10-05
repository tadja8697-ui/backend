import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../middleware/errorHandler.js';
import { resolvePeriod, isValidDate } from '../utils/dates.js';
import { isValidCategory } from '../utils/categories.js';

const router = express.Router();

// Toutes les routes sont protégées
router.use(authenticate);

// ============================================================
// HELPERS
// ============================================================

function rowToExpense(row) {
    return {
        id: row.id,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function nowISO() {
    return new Date().toISOString();
}

function findExpenseOrFail(id, userId) {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);

    if (!expense) {
        throw httpError(404, `Expense with ID ${id} not found.`);
    }
    if (expense.user_id !== userId) {
        throw httpError(403, 'Forbidden: you do not own this expense.');
    }

    return expense;
}

// ============================================================
// POST /expenses — Créer
// ============================================================

router.post('/', validate(['amount', 'category', 'description', 'date']), (req, res, next) => {
    try {
        const { amount, category, description, date } = req.body;
        const now = nowISO();

        const result = db.prepare(`
            INSERT INTO expenses (user_id, amount, category, description, date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, amount, category, description || null, date, now, now);

        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(rowToExpense(expense));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /expenses — Lister avec filtres
// ============================================================

router.get('/', (req, res, next) => {
    try {
        // ---------- Pagination ----------
        const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;

        // ---------- Construction du WHERE ----------
        let whereClause = 'WHERE user_id = ?';
        const params = [req.user.id];

        // --- Filtre par période (week/month/3months) ---
        if (req.query.period) {
            const range = resolvePeriod(req.query.period);
            if (!range) {
                return next(httpError(400, 'Invalid period. Use: week, month, or 3months.'));
            }
            whereClause += ' AND date BETWEEN ? AND ?';
            params.push(range.startDate, range.endDate);
        }

        // --- Filtre custom (startDate / endDate) ---
        if (req.query.startDate || req.query.endDate) {
            const start = req.query.startDate;
            const end = req.query.endDate;

            if (start && !isValidDate(start)) {
                return next(httpError(400, 'Invalid startDate. Use YYYY-MM-DD.'));
            }
            if (end && !isValidDate(end)) {
                return next(httpError(400, 'Invalid endDate. Use YYYY-MM-DD.'));
            }

            if (start) {
                whereClause += ' AND date >= ?';
                params.push(start);
            }
            if (end) {
                whereClause += ' AND date <= ?';
                params.push(end);
            }
        }

        // --- Filtre par catégorie ---
        if (req.query.category) {
            if (!isValidCategory(req.query.category)) {
                return next(httpError(400, 'Invalid category.'));
            }
            whereClause += ' AND category = ?';
            params.push(req.query.category);
        }

        // --- Filtre par montant ---
        if (req.query.minAmount) {
            whereClause += ' AND amount >= ?';
            params.push(parseFloat(req.query.minAmount));
        }
        if (req.query.maxAmount) {
            whereClause += ' AND amount <= ?';
            params.push(parseFloat(req.query.maxAmount));
        }

        // --- Recherche texte ---
        if (req.query.term) {
            whereClause += ' AND LOWER(description) LIKE ?';
            params.push(`%${req.query.term.toLowerCase()}%`);
        }

        // ---------- Tri ----------
        const allowedSortFields = ['date', 'amount', 'category', 'created_at'];
        const sortField = allowedSortFields.includes(req.query.sort) ? req.query.sort : 'date';
        const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

        // ---------- Total ----------
        const { count: total } = db.prepare(`
            SELECT COUNT(*) as count FROM expenses ${whereClause}
        `).get(...params);

        // ---------- Totaux agrégés ----------
        const stats = db.prepare(`
            SELECT
                COALESCE(SUM(amount), 0) as sum,
                COALESCE(AVG(amount), 0) as avg,
                COALESCE(MIN(amount), 0) as min,
                COALESCE(MAX(amount), 0) as max
            FROM expenses ${whereClause}
        `).get(...params);

        // ---------- Données paginées ----------
        const rows = db.prepare(`
            SELECT * FROM expenses
            ${whereClause}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({
            data: rows.map(rowToExpense),
            page,
            limit,
            total,
            stats: {
                sum: Math.round(stats.sum * 100) / 100,
                avg: Math.round(stats.avg * 100) / 100,
                min: Math.round(stats.min * 100) / 100,
                max: Math.round(stats.max * 100) / 100,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /expenses/summary — Résumé par catégorie
// ============================================================

router.get('/summary', (req, res, next) => {
    try {
        let whereClause = 'WHERE user_id = ?';
        const params = [req.user.id];

        // Appliquer les mêmes filtres de date
        if (req.query.period) {
            const range = resolvePeriod(req.query.period);
            if (range) {
                whereClause += ' AND date BETWEEN ? AND ?';
                params.push(range.startDate, range.endDate);
            }
        }

        const rows = db.prepare(`
            SELECT
                category,
                COUNT(*) as count,
                SUM(amount) as total
            FROM expenses
            ${whereClause}
            GROUP BY category
            ORDER BY total DESC
        `).all(...params);

        const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

        res.json({
            total: Math.round(grandTotal * 100) / 100,
            breakdown: rows.map((r) => ({
                category: r.category,
                count: r.count,
                total: Math.round(r.total * 100) / 100,
                percentage: grandTotal > 0
                    ? Math.round((r.total / grandTotal) * 10000) / 100
                    : 0,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /expenses/:id — Voir un
// ============================================================

router.get('/:id', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id) || id <= 0) return next(httpError(400, 'Invalid expense ID.'));

        const expense = findExpenseOrFail(id, req.user.id);
        res.json(rowToExpense(expense));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// PUT /expenses/:id — Remplacer
// ============================================================

router.put('/:id', validate(['amount', 'category', 'description', 'date']), (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id) || id <= 0) return next(httpError(400, 'Invalid expense ID.'));

        findExpenseOrFail(id, req.user.id);

        const { amount, category, description, date } = req.body;
        const now = nowISO();

        db.prepare(`
            UPDATE expenses
            SET amount = ?, category = ?, description = ?, date = ?, updated_at = ?
            WHERE id = ?
        `).run(amount, category, description || null, date, now, id);

        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
        res.json(rowToExpense(expense));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// DELETE /expenses/:id — Supprimer
// ============================================================

router.delete('/:id', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id) || id <= 0) return next(httpError(400, 'Invalid expense ID.'));

        findExpenseOrFail(id, req.user.id);

        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;