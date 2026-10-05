import http from 'node:http';
import { hashKey, get, set, isExpired, DEFAULT_TTL_MS } from './cache.js';

// Couleurs ANSI
const c = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

// Headers à ne pas propager (hop-by-hop)
const HOP_BY_HOP = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
]);

// Headers de réponse qui posent problème après décompression
const RESPONSE_SKIP = new Set([
    'content-encoding',    // On décompresse via fetch, ne pas réencoder
    'content-length',      // Node recalcule
    'transfer-encoding',   // Node gère
    'connection',
]);

// ============================================================
// SERVEUR
// ============================================================

/**
 * Démarre le serveur proxy.
 * @param {Object} options
 * @param {number} options.port
 * @param {string} options.origin - URL de base (ex: http://dummyjson.com)
 * @param {number} [options.ttl]   - TTL en ms
 * @returns {Promise<http.Server>}
 */
export async function startProxy({ port, origin, ttl = DEFAULT_TTL_MS }) {
    // Normaliser l'origine (retirer le slash final)
    const originBase = origin.replace(/\/+$/, '');

    const server = http.createServer(async (req, res) => {
        const start = Date.now();

        try {
            await handleRequest(req, res, originBase, ttl);
        } catch (err) {
            console.error(`${c.red}❌ Proxy error:${c.reset}`, err.message);

            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
            }
            res.end(`Bad Gateway: ${err.message}`);
        }

        const ms = Date.now() - start;
        // Le log est fait dans handleRequest pour avoir le bon statut
    });

    // Attendre que le serveur écoute
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, resolve);
    });

    // Gestion propre de Ctrl+C
    process.on('SIGINT', () => {
        console.log(`\n${c.dim}Shutting down...${c.reset}`);
        server.close(() => process.exit(0));
    });

    return server;
}

// ============================================================
// TRAITEMENT D'UNE REQUÊTE
// ============================================================

async function handleRequest(req, res, originBase, ttl) {
    const method = req.method;
    const fullUrl = originBase + req.url;

    // ---------- Décider si on cache ----------
    const isCacheable = method === 'GET' || method === 'HEAD';

    if (!isCacheable) {
        // POST / PUT / DELETE / PATCH → forward sans cache
        logRequest('PASS', method, req.url);
        await forwardAndSend(req, res, fullUrl);
        return;
    }

    // ---------- Chercher dans le cache ----------
    const key = hashKey(method, fullUrl);
    const cached = await get(key);

    if (cached && !isExpired(cached)) {
        // HIT
        logRequest('HIT', method, req.url);

        const age = Math.floor((Date.now() - cached.timestamp) / 1000);

        res.writeHead(cached.statusCode, {
            ...cached.headers,
            'X-Cache': 'HIT',
            'Age': String(age),
        });
        res.end(cached.body);
        return;
    }

    // ---------- MISS : forward et cache ----------
    logRequest('MISS', method, req.url);

    const originResponse = await fetch(fullUrl, {
        method,
        headers: filterRequestHeaders(req.headers),
        redirect: 'manual',   // On respecte les redirections du client
    });

    // Lire le body en texte (décompression auto)
    const body = await originResponse.text();

    // Headers nettoyés
    const headers = {};
    for (const [name, value] of originResponse.headers.entries()) {
        if (!RESPONSE_SKIP.has(name.toLowerCase())) {
            headers[name] = value;
        }
    }

    // Sauvegarder dans le cache
    await set(key, {
        statusCode: originResponse.status,
        headers,
        body,
        timestamp: Date.now(),
        ttl,
    });

    // Envoyer au client
    res.writeHead(originResponse.status, {
        ...headers,
        'X-Cache': 'MISS',
    });
    res.end(body);
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Forward une requête non-cacheable (POST, etc.) en streaming.
 */
async function forwardAndSend(req, res, fullUrl) {
    const body = await readBody(req);

    const originResponse = await fetch(fullUrl, {
        method: req.method,
        headers: filterRequestHeaders(req.headers),
        body: body.length > 0 ? body : undefined,
    });

    const responseBody = await originResponse.text();

    const headers = {};
    for (const [name, value] of originResponse.headers.entries()) {
        if (!RESPONSE_SKIP.has(name.toLowerCase())) {
            headers[name] = value;
        }
    }

    res.writeHead(originResponse.status, {
        ...headers,
        'X-Cache': 'BYPASS',
    });
    res.end(responseBody);
}

/**
 * Lit le body d'une requête entrante.
 */
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

/**
 * Filtre les headers entrants (retire les hop-by-hop).
 */
function filterRequestHeaders(headers) {
    const filtered = {};
    for (const [key, value] of Object.entries(headers)) {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
            filtered[key] = value;
        }
    }
    return filtered;
}

/**
 * Log avec code couleur.
 */
function logRequest(status, method, url) {
    const colors = {
        HIT: c.green,
        MISS: c.yellow,
        PASS: c.cyan,
    };
    const color = colors[status] || c.reset;
    console.log(`  ${color}${status.padEnd(5)}${c.reset} ${c.dim}${method}${c.reset} ${url}`);
}