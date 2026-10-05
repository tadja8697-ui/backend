import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ARTICLES_DIR = path.join(__dirname, '..', 'data', 'articles');

// S'assurer que le dossier existe
if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
}

// ============================================================
// LECTURE
// ============================================================

/**
 * Lit un article depuis son fichier.
 * @param {number} id
 * @returns {Object|null}
 */
function readArticle(id) {
    const filePath = path.join(ARTICLES_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) return null;

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`Erreur lecture article ${id}:`, err.message);
        return null;
    }
}

/**
 * Récupère TOUS les articles, triés par date descendante.
 * @returns {Array}
 */
export function getAllArticles() {
    try {
        const files = fs.readdirSync(ARTICLES_DIR)
            .filter((f) => f.endsWith('.json'));

        const articles = files
            .map((f) => {
                const id = parseInt(f.replace('.json', ''), 10);
                return readArticle(id);
            })
            .filter((a) => a !== null);

        // Tri par date desc
        return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
        console.error('Erreur lecture dossier:', err.message);
        return [];
    }
}

/**
 * Récupère un article par son id.
 * @param {number} id
 */
export function getArticle(id) {
    return readArticle(id);
}

/**
 * Calcule le prochain id disponible.
 * @returns {number}
 */
function getNextId() {
    try {
        const files = fs.readdirSync(ARTICLES_DIR)
            .filter((f) => f.endsWith('.json'))
            .map((f) => parseInt(f.replace('.json', ''), 10))
            .filter((n) => !Number.isNaN(n));

        if (files.length === 0) return 1;
        return Math.max(...files) + 1;
    } catch {
        return 1;
    }
}

// ============================================================
// ÉCRITURE
// ============================================================

/**
 * Crée un nouvel article.
 * @param {Object} data - { title, date, content }
 * @returns {Object} L'article créé
 */
export function createArticle({ title, date, content }) {
    const id = getNextId();
    const article = { id, title, date, content };

    const filePath = path.join(ARTICLES_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(article, null, 2), 'utf-8');

    return article;
}

/**
 * Met à jour un article existant.
 * @param {number} id
 * @param {Object} data
 * @returns {Object|null}
 */
export function updateArticle(id, { title, date, content }) {
    const existing = readArticle(id);
    if (!existing) return null;

    const article = {
        id,
        title,
        date,
        content,
    };

    const filePath = path.join(ARTICLES_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(article, null, 2), 'utf-8');

    return article;
}

/**
 * Supprime un article.
 * @param {number} id
 * @returns {boolean}
 */
export function deleteArticle(id) {
    const filePath = path.join(ARTICLES_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) return false;

    fs.unlinkSync(filePath);
    return true;
}