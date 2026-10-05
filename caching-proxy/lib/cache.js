import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Dossier du cache (dans le dossier courant)
const CACHE_DIR = path.join(process.cwd(), '.caching-proxy-cache');

// TTL par défaut : 5 minutes
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

// ============================================================
// CLÉ DE CACHE
// ============================================================

/**
 * Génère une clé unique pour une requête.
 * @param {string} method
 * @param {string} url - URL complète (origine + path + query)
 */
export function hashKey(method, url) {
    return crypto
        .createHash('sha256')
        .update(`${method}:${url}`)
        .digest('hex');
}

// ============================================================
// LECTURE / ÉCRITURE
// ============================================================

/**
 * Assure que le dossier existe.
 */
async function ensureDir() {
    await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Récupère une entrée du cache.
 * @param {string} key
 * @returns {Promise<Object|null>}
 */
export async function get(key) {
    const file = path.join(CACHE_DIR, `${key}.json`);

    try {
        const raw = await fs.readFile(file, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Sauvegarde une entrée dans le cache.
 * @param {string} key
 * @param {Object} entry
 */
export async function set(key, entry) {
    await ensureDir();
    const file = path.join(CACHE_DIR, `${key}.json`);
    await fs.writeFile(file, JSON.stringify(entry), 'utf-8');
}

/**
 * Vérifie si une entrée est expirée.
 * @param {Object} entry
 * @returns {boolean}
 */
export function isExpired(entry) {
    if (!entry || !entry.timestamp) return true;
    const ttl = entry.ttl || DEFAULT_TTL_MS;
    return Date.now() - entry.timestamp > ttl;
}

// ============================================================
// GESTION DU CACHE
// ============================================================

/**
 * Supprime tout le cache.
 * @returns {Promise<{ count: number, path: string }>}
 */
export async function clearCache() {
    let count = 0;

    try {
        const files = await fs.readdir(CACHE_DIR);
        count = files.filter((f) => f.endsWith('.json')).length;
    } catch {
        // Le dossier n'existe pas → 0 fichier
        count = 0;
    }

    await fs.rm(CACHE_DIR, { recursive: true, force: true });

    return { count, path: CACHE_DIR };
}

/**
 * Retourne les stats du cache.
 * @returns {Promise<{ count: number, sizeBytes: number }>}
 */
export async function getCacheStats() {
    try {
        const files = await fs.readdir(CACHE_DIR);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));

        let sizeBytes = 0;
        for (const file of jsonFiles) {
            const stat = await fs.stat(path.join(CACHE_DIR, file));
            sizeBytes += stat.size;
        }

        return { count: jsonFiles.length, sizeBytes };
    } catch {
        return { count: 0, sizeBytes: 0 };
    }
}