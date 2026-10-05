import axios from 'axios';

const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

/**
 * Récupère la météo actuelle d'une ville via Visual Crossing.
 * @param {string} city
 * @returns {Promise<Object>}
 */
export async function fetchWeatherFromAPI(city) {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        const err = new Error('WEATHER_API_KEY not configured');
        err.statusCode = 500;
        throw err;
    }

    const url = `${BASE_URL}/${encodeURIComponent(city)}`;

    try {
        const response = await axios.get(url, {
            params: {
                unitGroup: 'metric',
                include: 'current',
                key: apiKey,
                contentType: 'json',
            },
            timeout: 8000,   // 8 secondes max
        });

        const { currentConditions, resolvedAddress } = response.data;

        // Normaliser la réponse (on expose seulement ce dont on a besoin)
        return {
            resolvedAddress,
            temp: currentConditions.temp,
            conditions: currentConditions.conditions,
            icon: currentConditions.icon,
            humidity: currentConditions.humidity,
            windspeed: currentConditions.windspeed,
            feelslike: currentConditions.feelslike,
        };
    } catch (err) {
        // ---------- GESTION DES ERREURS ----------
        if (err.response) {
            // Erreur HTTP de Visual Crossing (4xx, 5xx)
            const status = err.response.status;

            if (status === 400) {
                const e = new Error(`City "${city}" not found.`);
                e.statusCode = 404;
                throw e;
            }
            if (status === 401) {
                const e = new Error('Invalid weather API key.');
                e.statusCode = 500;
                throw e;
            }

            const e = new Error(`Weather service error (HTTP ${status}).`);
            e.statusCode = 502;
            throw e;
        }

        if (err.code === 'ECONNABORTED') {
            const e = new Error('Weather service timeout.');
            e.statusCode = 504;
            throw e;
        }

        // Erreur réseau
        const e = new Error('Cannot reach weather service.');
        e.statusCode = 502;
        throw e;
    }
}