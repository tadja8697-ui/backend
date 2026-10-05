import { getCache, setCache } from './redis.js';
import { fetchWeatherFromAPI } from './weather.js';

const CACHE_PREFIX = 'weather:';
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL || '43200', 10);

/**
 * Récupère la météo avec cache.
 * 1. Vérifie le cache
 * 2. Si miss → appelle l'API
 * 3. Sauve le résultat dans le cache
 * 4. Renvoie { data, cached }
 *
 * @param {string} city
 * @returns {Promise<{ data: Object, cached: boolean }>}
 */
export async function getWeatherWithCache(city) {
    // Normaliser la ville (lowercase, trim)
    const normalizedCity = city.trim().toLowerCase();
    const cacheKey = `${CACHE_PREFIX}${normalizedCity}`;

    // ---------- 1. Vérifier le cache ----------
    const cached = await getCache(cacheKey);

    if (cached) {
        console.log(`💾 Cache HIT: ${cacheKey}`);
        return { data: cached, cached: true };
    }

    console.log(`🌐 Cache MISS: ${cacheKey} — calling API`);

    // ---------- 2. Appel API ----------
    const fresh = await fetchWeatherFromAPI(city);

    // ---------- 3. Sauvegarder dans le cache ----------
    await setCache(cacheKey, fresh, DEFAULT_TTL);

    return { data: fresh, cached: false };
}