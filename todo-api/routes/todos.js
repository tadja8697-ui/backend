import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../middleware/errorHandler.js';

const router = express.Router();

// Toutes les routes ici nécessitent une auth
router.use(authenticate);

// ============================================================
// HELPERS
// ============================================================

function rowToTodo(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        completed: Boolean(row.completed),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function nowISO() {
    return new Date().toISOString();
}

/**
 * Vérifie que le todo appartient à l'user.
 * @throws {Error} 404 si introuvable, 403 si pas propriétaire
 */
function findTodoOrFail(id, userId) {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);

    if (!todo) {
        throw httpError(404, `Todo with ID ${id} not found.`);
    }

    if (todo.user_id !== userId) {
        throw httpError(403, 'Forbidden: you do not own this todo.');
    }

    return todo;
}

// ============================================================
// POST /todos — Créer
// ============================================================

router.post('/', validate(['title', 'description']), (req, res, next) => {
    try {
        const { title, description } = req.body;
        const now = nowISO();

        const result = db.prepare(`
            INSERT INTO todos (user_id, title, description, completed, created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, ?)
        `).run(req.user.id, title, description || null, now, now);

        const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(rowToTodo(todo));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /todos — Lister (avec pagination + filtres)
// ============================================================

router.get('/', (req, res, next) => {
    try {
        // ---------- Pagination ----------
        const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;

        // ---------- Filtres optionnels ----------
        const { completed, term } = req.query;

        let whereClause = 'WHERE user_id = ?';
        const params = [req.user.id];

        if (completed !== undefined) {
            const isCompleted = completed === 'true' || completed === '1' ? 1 : 0;
            whereClause += ' AND completed = ?';
            params.push(isCompleted);
        }

        if (term) {
            whereClause += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
            const pattern = `%${term.toLowerCase()}%`;
            params.push(pattern, pattern);
        }

        // ---------- Total ----------
        const { count: total } = db.prepare(`
            SELECT COUNT(*) as count FROM todos ${whereClause}
        `).get(...params);

        // ---------- Données paginées ----------
        const rows = db.prepare(`
            SELECT * FROM todos
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({
            data: rows.map(rowToTodo),
            page,
            limit,
            total,
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /todos/:id — Voir un
// ============================================================

router.get('/:id', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id) || id <= 0) {
            return next(httpError(400, 'Invalid todo ID.'));
        }

        const todo = findTodoOrFail(id, req.user.id);
        res.json(rowToTodo(todo));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// PUT /todos/:id — Remplacer
// ============================================================

router.put('/:id', validate(['title', 'description']), (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id) || id <= 0) {
            return next(httpError(400, 'Invalid todo ID.'));
        }

        // Vérifie existence + propriétaire
        findTodoOrFail(id, req.user.id);

        const { title, description } = req.body;
        const now = nowISO();

        db.prepare(`
            UPDATE todos
            SET title = ?, description = ?, updated_at = ?
            WHERE id = ?
        `).run(title, description || null, now, id);

        const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
        res.json(rowToTodo(todo));
    } catch (err) {
        next(err);
    }
});

// ============================================================
// DELETE /todos/:id — Supprimer
// ============================================================

router.delete('/:id', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id) || id <= 0) {
            return next(httpError(400, 'Invalid todo ID.'));
        }

        // Vérifie existence + propriétaire
        findTodoOrFail(id, req.user.id);

        db.prepare('DELETE FROM todos WHERE id = ?').run(id);

        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;