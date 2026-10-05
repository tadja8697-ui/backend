Le pattern "API + cache Redis" :

1. SETUP
   npm install express axios redis express-rate-limit

2. VARIABLES D'ENV
   WEATHER_API_KEY=...
   REDIS_URL=redis://localhost:6379
   CACHE_TTL=43200   (12h)

3. CLIENT REDIS (lib/redis.js)
   client = createClient({ url })
   client.on('error', ...)   ← OBLIGATOIRE
   await client.connect()

4. HELPERS CACHE
   setCache(key, value, ttl)  → SET key JSON EX ttl
   getCache(key)              → GET + JSON.parse

5. LOGIQUE CACHE-ASIDE (lib/cache.js)
   1. Lire le cache
   2. Si miss → appeler l'API
   3. Écrire dans le cache
   4. Retourner { data, cached }

6. APPEL EXTERNE (lib/weather.js)
   axios.get(url, { timeout: 8000 })
   Normaliser la réponse
   Gérer 4xx, 5xx, timeout, network

7. RATE LIMITING
   rateLimit({ windowMs, max })

8. SERVEUR
   Middleware log → routes → 404 → error handler (4 args)

RÈGLES D'OR :
   - Toujours normaliser la clé (toLowerCase().trim())
   - Toujours timeout sur axios
   - Toujours try/catch sur Redis
   - Toujours normaliser la réponse de l'API externe
   - Middleware d'erreur en DERNIER (4 arguments)
   - TTL < fréquence de changement des données

🎯 ÉTAPE 6 : Explication détaillée
🔹 6.1 — Le Cache-Aside pattern (LE pattern)
javascript
// 1. Lire le cache
const cached = await getCache(key);
if (cached) return { data: cached, cached: true };

// 2. Cache miss → source
const fresh = await fetchFromAPI(city);

// 3. Écrire dans le cache
await setCache(key, fresh, TTL);

// 4. Retourner
return { data: fresh, cached: false };
💡 Pourquoi ce pattern ?

Simple : 4 étapes.

Robuste : si le cache est down, on continue.

Universel : utilisé partout (CDN, DB, API...).

Alternatives :

Write-Through : écrire dans le cache ET la DB à chaque write.

Write-Behind : écrire dans le cache, la DB plus tard (async).

💡 Pour une API de lecture → Cache-Aside est idéal.

🔹 6.2 — La clé de cache
javascript
const cacheKey = `weather:${city.toLowerCase().trim()}`;
Résultat :

"Paris" → weather:paris

"PARIS" → weather:paris

" Paris " → weather:paris

✅ Une seule clé pour toutes les variantes → cache efficace.

💡 Prefix weather: : si tu ajoutes d'autres caches (users, sessions...), tu peux les lister par préfixe avec KEYS weather:*.

⚠️ KEYS en prod : à éviter sur de grosses bases. Utiliser SCAN.

🔹 6.3 — Le TTL (Time To Live)
javascript
await client.set(key, value, { EX: 43200 });  // 12h
💡 Pourquoi 12h ?

Météo : change toutes les heures, mais 12h c'est OK pour une API publique.

Visual Crossing : 1000 appels/jour en gratuit.

100 villes × 2 appels/jour = 200 → largement dans la limite.

Règle : le TTL doit être plus court que la fréquence de changement des données.

Donnée	TTL raisonnable
Météo actuelle	10-30 min
Prévisions 7j	3-6h
Profil utilisateur	5-15 min
Config de l'app	1h
🔹 6.4 — La gestion d'erreurs à 4 niveaux
Niveau 1 : erreur réseau (axios).

javascript
if (err.code === 'ECONNABORTED') { /* timeout */ }
Niveau 2 : erreur HTTP de l'API externe.

javascript
if (err.response) {
    const status = err.response.status;
    // 400 → 404, 401 → 500, autre → 502
}
Niveau 3 : erreur Redis (dans les helpers).

javascript
try { await client.set(...); } catch (err) { console.error(...); }
Niveau 4 : middleware global.

javascript
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ error: err.message });
});
💡 Résultat : aucune erreur ne crashe le serveur, et chaque erreur a un code HTTP précis.

🔹 6.5 — Le rate limiting
javascript
export const apiLimiter = rateLimit({
    windowMs: 60000,   // 1 minute
    max: 30,           // 30 requêtes
});
En mémoire par défaut : OK pour un serveur unique.

⚠️ Multi-instances : chaque instance aurait son propre compteur. Solution : Redis store.

bash
npm install rate-limit-redis
javascript
import RedisStore from 'rate-limit-redis';
import { client } from './lib/redis.js';

const apiLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
    }),
    windowMs: 60000,
    max: 30,
});
💡 En prod → toujours un store partagé.

🔹 6.6 — Le middleware d'erreur (ordre critique)
javascript
// 1. Routes
app.get('/api/weather/:city', ...);

// 2. 404
app.use((req, res) => { ... });

// 3. Erreur (4 args)
app.use((err, req, res, next) => { ... });
⚠️ L'ordre est CRUCIAL :

404 en avant-dernier : attrape les routes non matchées.

Erreur en dernier : intercepte tout next(err).

Express reconnaît le middleware d'erreur par ses 4 arguments (pas 3). Si tu en as 3, c'est un middleware normal.

🔹 6.7 — Le timeout sur axios
javascript
axios.get(url, { timeout: 8000 });
💡 Sans timeout : si Visual Crossing ne répond pas, ton API attend indéfiniment. Le client HTTP finit par timeout (30s par défaut).

Avec 8s : tu coupes plus tôt → erreur 504 → l'utilisateur peut réessayer.

Règle : toujours un timeout sur un appel réseau externe.

🔹 6.8 — La normalisation de la réponse
javascript
return {
    resolvedAddress,
    temp: currentConditions.temp,
    conditions: currentConditions.conditions,
    // ...
};
💡 Pourquoi ?

Découplage : si l'API change, on modifie un seul endroit.

Poids réduit : on ne renvoie que le nécessaire.

Sécurité : on ne renvoie pas les champs sensibles.

Pattern pro : adapter la réponse externe à ton propre format.

🔹 6.9 — Le log middleware
javascript
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    });
    next();
});
Résultat :

text
GET /api/weather/Paris → 200 (487ms)
GET /api/weather/Paris → 200 (5ms)       ← 2e appel, caché
GET /api/weather/London → 200 (512ms)
💡 Différence entre 487ms et 5ms : le cache. On voit immédiatement son effet.

🔹 6.10 — La gestion "Redis down"
javascript
try {
    await connectRedis();
    app.listen(PORT, ...);
} catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
}
💡 2 stratégies possibles :

A. Redis obligatoire (notre choix) :

Si Redis down → le serveur refuse de démarrer.

Avantage : signale un problème immédiatement.

Inconvénient : 0 service si Redis down.

B. Redis optionnel :

Si Redis down → le serveur démarre, mais pas de cache.

Avantage : résilience.

Inconvénient : silencieusement moins performant.

Pour un vrai projet → B. Pour un exercice → A (plus clair).

💡 Astuce de prof
Le caching est LA compétence qui sépare un junior d'un senior. Pourquoi ?

Junior : "Je fais un fetch, je renvoie."

Senior : "Je cache, je gère l'expiration, je normalise les clés, je gère les erreurs Redis."

Les 3 règles à graver :
1. Toujours normaliser la clé. "Paris" = "paris" = "PARIS".

2. Toujours timeout sur les appels externes. Sinon ton API rame.

3. Toujours try/catch sur Redis. Sinon ton API crashe quand Redis tombe.

Le test mental ultime :
Appelle la même ville 2 fois :

1ère : ~500ms, cached: false.

2e : ~5ms, cached: true.

Si tu ne vois pas la différence → le cache ne marche pas.
Si tu vois 5ms → tu as un vrai cache. ✅

Pour aller plus loin :
Redis docs : redis.io/docs

node-redis : github.com/redis/node-redis

express-rate-limit : github.com/express-rate-limit/express-rate-limit

Cache-Aside pattern : docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html

Visual Crossing API : visualcrossing.com

