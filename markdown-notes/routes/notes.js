import express from 'express';
import multer from 'multer';
import { renderMarkdown, extractTitle, getMarkdownStats } from '../lib/markdown.js';
import { checkGrammar } from '../lib/grammar.js';
import { listNotes, getNote, createNote, deleteNote, countNotes } from '../lib/storage.js';
import { httpError } from '../middleware/errorHandler.js';

const router = express.Router();

// ============================================================
// MULTER (upload en mémoire)
// ============================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1 * 1024 * 1024,   // 1 MB max
    },
    fileFilter: (req, file, cb) => {
        // Accepter uniquement .md, .markdown, .txt
        const ok = /\.(md|markdown|txt)$/i.test(file.originalname);
        if (!ok) {
            return cb(new Error('Only .md, .markdown and .txt files are allowed.'));
        }
        cb(null, true);
    },
});

// ============================================================
// POST /notes/check-grammar — Vérifier la grammaire
// ============================================================

router.post('/check-grammar', (req, res, next) => {
    try {
        const { content } = req.body || {};

        if (!content || typeof content !== 'string') {
            return next(httpError(400, '"content" is required and must be a string.'));
        }

        if (content.length > 50_000) {
            return next(httpError(413, 'Content too large (max 50,000 chars).'));
        }

        const result = checkGrammar(content);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ============================================================
// POST /notes — Créer (upload fichier OU JSON)
// ============================================================

router.post('/', upload.single('file'), (req, res, next) => {
    try {
        let content;
        let source;
        let title;

        if (req.file) {
            // ---------- Cas 1 : upload de fichier ----------
            content = req.file.buffer.toString('utf-8');
            source = 'upload';

            // Titre : depuis le form-data OU extrait du MD
            title = req.body?.title || extractTitle(content);
        } else if (req.body?.content) {
            // ---------- Cas 2 : JSON ----------
            content = req.body.content;
            source = 'manual';
            title = req.body.title || extractTitle(content);
        } else {
            return next(httpError(400, 'Provide a file (field "file") or a JSON body with "content".'));
        }

        if (!content.trim()) {
            return next(httpError(400, 'Content cannot be empty.'));
        }

        if (content.length > 1_000_000) {
            return next(httpError(413, 'Content too large (max 1 MB).'));
        }

        // Créer la note
        const note = createNote({ title, content, source });

        // Calculer les stats pour la réponse
        const stats = getMarkdownStats(content);

        res.status(201).json({
            id: note.id,
            title: note.title,
            source: note.source,
            createdAt: note.createdAt,
            stats,
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /notes — Lister
// ============================================================

router.get('/', (req, res, next) => {
    try {
        const notes = listNotes();
        res.json({
            data: notes,
            total: notes.length,
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /notes/:id — Récupérer une note (JSON)
// ============================================================

router.get('/:id', (req, res, next) => {
    try {
        const note = getNote(req.params.id);
        if (!note) return next(httpError(404, `Note "${req.params.id}" not found.`));

        res.json(note);
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /notes/:id/render — Rendre en HTML
// ============================================================

router.get('/:id/render', (req, res, next) => {
    try {
        const note = getNote(req.params.id);
        if (!note) return next(httpError(404, `Note "${req.params.id}" not found.`));

        const html = renderMarkdown(note.content);

        // ---------- Format 1 : HTML brut (?format=html) ----------
        if (req.query.format === 'html') {
            res.set('Content-Type', 'text/html; charset=utf-8');
            return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(note.title)}</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
        pre { background: #f3f4f6; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
        h1, h2, h3 { line-height: 1.3; }
        img { max-width: 100%; height: auto; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    </style>
</head>
<body>
    <article>${html}</article>
</body>
</html>`);
        }

        // ---------- Format 2 : JSON (défaut) ----------
        res.json({
            id: note.id,
            title: note.title,
            html,
            renderedAt: new Date().toISOString(),
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// DELETE /notes/:id — Supprimer
// ============================================================

router.delete('/:id', (req, res, next) => {
    try {
        const ok = deleteNote(req.params.id);
        if (!ok) return next(httpError(404, `Note "${req.params.id}" not found.`));

        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export default router;