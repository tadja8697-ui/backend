Le pattern "URL Shortener" :

1. GÉNÉRATION DE CODE
   const CHARS = 'a-zA-Z0-9' (Base62)
   crypto.randomInt(0, 62) → 7 chars
   → 62^7 = 3,5 billions de combinaisons

2. STOCKAGE
   CREATE TABLE urls (
     id, url, short_code UNIQUE, access_count, created_at, updated_at
   )

3. ENDPOINTS
   POST   /shorten              → 201 (retry si collision)
   GET    /shorten/:code        → 200
   PUT    /shorten/:code        → 200
   DELETE /shorten/:code        → 204
   GET    /shorten/:code/stats  → 200 (avec accessCount)
   GET    /:code                → 302 (increment + redirect)

4. VALIDATION
   new URL(str) + protocol ∈ {http, https}
   Refuse javascript:, data:, file:

5. ORDRE DES ROUTES
   1. express.json()
   2. /health, /
   3. /shorten (API)
   4. /:code (redirect) ← EN DERNIER

RÈGLES D'OR :
   - crypto.randomInt > Math.random
   - UNIQUE sur short_code + retry
   - 302 (pas 301) pour compter les clics
   - Route spécifique AVANT générique
   - Whitelist http/https (pas de blacklist)
   - access_count + 1 côté SQL (atomique)

💡 Astuce de prof
Ce projet est LE projet "classique" d'entretien technique. On te demande souvent :

"Comment générer un code unique ?" → Base62 + UNIQUE constraint + retry.

"Comment compter les clics ?" → UPDATE atomique + 302 (pas 301).

"Comment éviter les collisions ?" → 62^7 = 3,5 milliards.

Les 3 règles à graver :
1. crypto.randomInt > Math.random. Pour tout ce qui touche à la sécurité.

2. 302 > 301. Toujours compter les clics.

3. Route spécifique AVANT générique. Sinon /shorten serait avalé par /:code.

Le test mental ultime :
Crée 10 short URLs. Toutes doivent avoir des codes DIFFÉRENTS.

Si tu vois des doublons → bug de génération.

Si tous les codes sont uniques → c'est bon. ✅

Pour aller plus loin :
RFC 3986 (URI) : datatracker.ietf.org/doc/html/rfc3986

HTTP Redirects : developer.mozilla.org/fr/docs/Web/HTTP/Redirections

better-sqlite3 : github.com/WiseLibs/better-sqlite3

Bit.ly architecture : engineering.bitly.com