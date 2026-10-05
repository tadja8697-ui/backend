import { createClient } from 'redis';

// ============================================================
// 1. CRÉATION DU CLIENT
// ============================================================

const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// ============================================================
// 2. GESTION DES ERREURS (avant la connexion)
// ============================================================

client.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
});

client.on('connect', () => {
    console.log('✅ Redis connected');
});

client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});

// ============================================================
// 3. CONNEXION
// ============================================================

export async function connectRedis() {
    if (!client.isOpen) {
        await client.connect();
    }
    return client;
}

// ============================================================
// 4. HELPERS
// ============================================================

/**
 * Sauvegarde une valeur JSON dans le cache avec expiration.
 * @param {string} key
 * @param {Object} value
 * @param {number} ttlSeconds
 */
export async function setCache(key, value, ttlSeconds) {
    try {
        await client.set(key, JSON.stringify(value), {
            EX: ttlSeconds,
        });
    } catch (err) {
        console.error('❌ Redis SET error:', err.message);
    }
}

/**
 * Récupère une valeur JSON du cache.
 * @param {string} key
 * @returns {Promise<Object|null>}
 */
export async function getCache(key) {
    try {
        const raw = await client.get(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.error('❌ Redis GET error:', err.message);
        return null;
    }
}

/**
 * Supprime une clé du cache.
 * @param {string} key
 */
export async function deleteCache(key) {
    try {
        await client.del(key);
    } catch (err) {
        console.error('❌ Redis DEL error:', err.message);
    }
}

export { client };