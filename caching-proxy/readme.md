🎯 ÉTAPE 4 : Explication détaillée
🔹 4.1 — Le cycle HIT / MISS / BYPASS
Statut	Quand ?	Header X-Cache
HIT	Trouvé dans le cache ET non expiré	HIT
MISS	Pas dans le cache (ou expiré) → forwardé + caché	MISS
BYPASS	Méthode non cacheable (POST, PUT...)	BYPASS
💡 Pourquoi 3 statuts ? Pour distinguer "non caché parce que pas cacheable" de "non caché parce que vide". Debug plus facile.

🔹 4.2 — Le hash de cache
javascript
crypto.createHash('sha256').update(`${method}:${url}`).digest('hex')
Exemples :

GET:http://dummyjson.com/products → a3f8b2c1e4d5...

GET:http://dummyjson.com/products?limit=10 → clé différente

GET:http://dummyjson.com/users → clé différente

💡 sha256 : hash cryptographique, stable et unique. Parfait pour une clé de cache.

⚠️ Pourquoi method dans la clé ? Parce que GET /products et POST /products sont différents. Même si on ne cache que GET, c'est plus propre.

🔹 4.3 — Les headers hop-by-hop
javascript
const HOP_BY_HOP = new Set([
    'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailer',
    'transfer-encoding', 'upgrade', 'host',
]);
💡 C'est quoi ? Des headers qui concernent UNE seule connexion TCP, pas la ressource. Ils ne doivent JAMAIS être transmis par un proxy.

Exemple :

Le client envoie Connection: keep-alive.

Si on le forward au serveur, ça n'a pas de sens (c'est une relation client-proxy, pas client-origin).

On le retire.

Source : RFC 7230 § 6.1.

🔹 4.4 — Le problème du Content-Encoding
javascript
const RESPONSE_SKIP = new Set([
    'content-encoding',    // ← IMPORTANT
    'content-length',
    'transfer-encoding',
    'connection',
]);
⚠️ Le piège :

L'origine envoie du gzip avec Content-Encoding: gzip.

fetch décompresse automatiquement (comportement par défaut).

On cache le body décompressé.

On renvoie au client avec Content-Encoding: gzip → le client essaie de décompresser un contenu déjà décompressé → bug.

Solution : ne pas propager Content-Encoding. Le client recevra du texte brut.

💡 Analogie : c'est comme si tu déballais un cadeau et que tu remettais le papier cadeau autour. Le destinataire ouvrirait un paquet vide.

🔹 4.5 — Le TTL (Time To Live)
javascript
export function isExpired(entry) {
    const ttl = entry.ttl || DEFAULT_TTL_MS;
    return Date.now() - entry.timestamp > ttl;
}
💡 5 min par défaut : compromis entre fraîcheur et performance.

Configurable : --ttl 60000 (1 min) pour les données volatiles, --ttl 3600000 (1h) pour les données stables.

Nettoyage : on ne supprime pas activement les entrées expirées. Elles sont ignorées à la lecture → remplacées au prochain MISS.

💡 Alternative : un setInterval qui nettoie toutes les minutes. Plus complexe mais plus propre. À ajouter en bonus.

🔹 4.6 — Le filtrage des headers de requête
javascript
function filterRequestHeaders(headers) {
    const filtered = {};
    for (const [key, value] of Object.entries(headers)) {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
            filtered[key] = value;
        }
    }
    return filtered;
}
Test mental : si le client envoie Host: localhost:3000, on ne le forwarde pas. L'origine doit recevoir Host: dummyjson.com (géré automatiquement par fetch).

🔹 4.7 — Le redirect: 'manual'
javascript
const originResponse = await fetch(fullUrl, {
    method,
    headers: filterRequestHeaders(req.headers),
    redirect: 'manual',
});
💡 Pourquoi ? Par défaut, fetch suit les redirections (302, 301...). Mais un proxy ne doit PAS suivre : il doit renvoyer la redirection au client qui décidera.

Avec manual :

L'origine renvoie 302 Location: /new-path.

On renvoie 302 Location: /new-path au client.

Le client suit.

Sans manual :

fetch suit automatiquement.

Le client ne voit jamais la redirection.

Comportement incorrect pour un proxy.

🔹 4.8 — La gestion de Ctrl+C
javascript
process.on('SIGINT', () => {
    console.log(`\n${c.dim}Shutting down...${c.reset}`);
    server.close(() => process.exit(0));
});
💡 SIGINT : signal envoyé par Ctrl+C.
💡 server.close(callback) : arrête d'accepter de nouvelles connexions, finit les en cours, puis appelle le callback.

Résultat : arrêt propre au lieu d'un process.exit() brutal.

🔹 4.9 — Le EADDRINUSE
javascript
if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use.`);
}
💡 Erreur courante : tu essaies de démarrer un serveur sur un port déjà utilisé.

Message clair : l'utilisateur sait quoi faire (utiliser un autre port ou tuer le process).

🔹 4.10 — Le --stats (bonus)
javascript
if (args.stats) {
    const { count, sizeBytes } = await getCacheStats();
    console.log(`Entries: ${count}`);
    console.log(`Size:    ${formatBytes(sizeBytes)}`);
}
💡 Utile pour débugger : "Combien de choses sont cachées ? Ça prend combien de place ?"

💡 Astuce de prof
Ce projet est impressionnant en portfolio. Pourquoi ?

Il touche à HTTP bas niveau (headers, status, body).

Il montre une compréhension profonde du web.

C'est exactement ce que font les CDN (Cloudflare, Fastly).

Les 3 règles à graver :
1. Clé = méthode + URL complète. Sinon /x et /X?y=1 seraient confondus.

2. Filtrage des headers obligatoire. Les hop-by-hop ne se propagent pas.

3. Content-Encoding à retirer. Sinon double décompression côté client.

Le test mental ultime :
Fais curl -i http://localhost:3000/products 2 fois.

1ère : X-Cache: MISS, ~500ms.

2e : X-Cache: HIT, ~5ms.

Si la 2e prend 500ms → le cache ne marche pas.
Si elle prend 5ms → tu as un vrai proxy. ✅

Pour aller plus loin :
RFC 7234 (HTTP Caching) : datatracker.ietf.org/doc/html/rfc7234

RFC 7230 (HTTP/1.1 Message Syntax) : datatracker.ietf.org/doc/html/rfc7230

Cloudflare cache docs : developers.cloudflare.com/cache

Nginx proxy_cache : nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache

Varnish Cache : varnish-cache.org

Le pattern "Caching Proxy" :

1. SERVEUR HTTP
   http.createServer((req, res) => { ... })
   server.listen(port)

2. CLÉ DE CACHE
   sha256(method + ":" + fullUrl)

3. FLOW
   if (!cacheable) → forward + X-Cache: BYPASS
   if (cached && !expired) → return + X-Cache: HIT
   else → forward + cache + X-Cache: MISS

4. STOCKAGE (filesystem)
   .caching-proxy-cache/<hash>.json
   { statusCode, headers, body, timestamp, ttl }

5. FILTRAGE DES HEADERS
   Hop-by-hop : connection, host, transfer-encoding...
   Response skip : content-encoding, content-length...

6. SUIVI DES REDIRECTIONS
   fetch(url, { redirect: 'manual' })

RÈGLES D'OR :
   - Clé = méthode + URL complète
   - Filtrer les hop-by-hop headers
   - NE PAS propager Content-Encoding (fetch décompresse)
   - redirect: 'manual' pour un proxy
   - Cacher uniquement GET/HEAD
   - Filesystem → persistance entre invocations
   - SIGINT → server.close() propre