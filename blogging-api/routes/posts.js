import express from 'express';
import db from '../db.js';
import { validatePost } from '../middleware/validatePost.js';
import { httpError } from '../middleware/errorHandler.js';

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

/**
 * Convertit une ligne SQL en objet API.
 */
function rowToPost(row) {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: JSON.parse(row.tags),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function nowISO() {
    return new Date().toISOString();
}

// ============================================================
// GET /posts — Lister (avec filtres)
// ============================================================

router.get('/', (req, res) => {
    const { term, category, tag } = req.query;

    let query = 'SELECT * FROM posts';
    const conditions = [];
    const params = [];

    // ---------- Filtre search (wildcard) ----------
    if (term) {
        conditions.push(`(
            LOWER(title) LIKE ? OR
            LOWER(content) LIKE ? OR
            LOWER(category) LIKE ?
        )`);
        const pattern = `%${term.toLowerCase()}%`;
        params.push(pattern, pattern, pattern);
    }

    // ---------- Filtre category ----------
    if (category) {
        conditions.push('LOWER(category) = ?');
        params.push(category.toLowerCase());
    }

    // ---------- Filtre tag ----------
    if (tag) {
        // On cherche dans la string JSON des tags
        conditions.push('LOWER(tags) LIKE ?');
        params.push(`%"${tag.toLowerCase()}"%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);

    res.json(rows.map(rowToPost));
});

// ============================================================
// GET /posts/:id — Voir un post
// ============================================================

router.get('/:id', (req, res, next) => {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id) || id <= 0) {
        return next(httpError(400, 'Invalid post ID.'));
    }

    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);

    if (!row) {
        return next(httpError(404, `Post with ID ${id} not found.`));
    }

    res.json(rowToPost(row));
});

// ============================================================
// POST /posts — Créer
// ============================================================

router.post('/', validatePost, (req, res) => {
    const { title, content, category, tags } = req.body;
    const now = nowISO();

    const result = db.prepare(`
        INSERT INTO posts (title, content, category, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, content, category, JSON.stringify(tags), now, now);

    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);

    // 201 Created + Location header
    res
        .status(201)
        .location(`/posts/${row.id}`)
        .json(rowToPost(row));
});

// ============================================================
// PUT /posts/:id — Remplacer
// ============================================================

router.put('/:id', validatePost, (req, res, next) => {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id) || id <= 0) {
        return next(httpError(400, 'Invalid post ID.'));
    }

    // Vérifier existence
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
        return next(httpError(404, `Post with ID ${id} not found.`));
    }

    const { title, content, category, tags } = req.body;
    const now = nowISO();

    db.prepare(`
        UPDATE posts
        SET title = ?, content = ?, category = ?, tags = ?, updated_at = ?
        WHERE id = ?
    `).run(title, content, category, JSON.stringify(tags), now, id);

    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);

    res.json(rowToPost(row));
});

// ============================================================
// DELETE /posts/:id — Supprimer
// ============================================================

router.delete('/:id', (req, res, next) => {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id) || id <= 0) {
        return next(httpError(400, 'Invalid post ID.'));
    }

    const result = db.prepare('DELETE FROM posts WHERE id = ?').run(id);

    if (result.changes === 0) {
        return next(httpError(404, `Post with ID ${id} not found.`));
    }

    // 204 No Content
    res.status(204).send();
});

export default router;