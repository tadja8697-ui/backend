import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// Créer le dossier data/
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// LECTURE / ÉCRITURE
// ============================================================

function loadNotes() {
    try {
        if (!fs.existsSync(NOTES_FILE)) {
            fs.writeFileSync(NOTES_FILE, '[]', 'utf-8');
            return [];
        }

        const raw = fs.readFileSync(NOTES_FILE, 'utf-8');
        if (!raw.trim()) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error('Erreur lecture notes:', err.message);
        return [];
    }
}

function saveNotes(notes) {
    try {
        fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
    } catch (err) {
        throw new Error(`Failed to save notes: ${err.message}`);
    }
}

// ============================================================
// HELPERS
// ============================================================

function nowISO() {
    return new Date().toISOString();
}

/**
 * Génère un ID court et unique.
 */
function generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `${timestamp}-${random}`;
}

// ============================================================
// CRUD
// ============================================================

/**
 * Liste toutes les notes (sans le contenu complet).
 */
export function listNotes() {
    return loadNotes().map((note) => ({
        id: note.id,
        title: note.title,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        stats: note.stats,
    }));
}

/**
 * Récupère une note complète par son ID.
 */
export function getNote(id) {
    return loadNotes().find((n) => n.id === id) || null;
}

/**
 * Crée une nouvelle note.
 */
export function createNote({ title, content, source = 'manual' }) {
    const notes = loadNotes();
    const now = nowISO();

    const note = {
        id: generateId(),
        title: title || 'Untitled',
        content,
        source,           // 'manual' ou 'upload'
        createdAt: now,
        updatedAt: now,
    };

    notes.push(note);
    saveNotes(notes);

    return note;
}

/**
 * Supprime une note.
 */
export function deleteNote(id) {
    const notes = loadNotes();
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) return false;

    notes.splice(index, 1);
    saveNotes(notes);
    return true;
}

/**
 * Compte le nombre total de notes.
 */
export function countNotes() {
    return loadNotes().length;
}