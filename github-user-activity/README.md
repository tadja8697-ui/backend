
🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le shebang et le bin
javascript
#!/usr/bin/env node
json
"bin": { "github-activity": "./index.js" }
Résultat : après npm link, tu peux taper github-activity kamranahmedse depuis n'importe où. ✅

🔹 5.2 — Le fetch natif avec headers
javascript
const response = await fetch(url, {
    headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'github-activity-cli',
    },
});
💡 Pourquoi ces headers ?

Accept : demande le format v3 de l'API GitHub (le plus stable).

User-Agent : GitHub exige cet header. Sans lui → 403.

⚠️ Piège : si tu oublies User-Agent, GitHub renvoie 403 Forbidden. C'est une règle de l'API.

🔹 5.3 — Le encodeURIComponent
javascript
const url = `${API_BASE}/users/${encodeURIComponent(username)}/events`;
💡 Pourquoi ? Si le username contient des caractères spéciaux (bien que GitHub n'en autorise pas), on évite de casser l'URL.

Bonne pratique : toujours encoder les valeurs venant de l'utilisateur.

🔹 5.4 — Le switch sur les types d'events
javascript
switch (event.type) {
    case 'PushEvent': {
        const count = payload.commits?.length || 0;
        return `Pushed ${count} commit${count > 1 ? 's' : ''} to ${repo}`;
    }
    // ...
}
💡 Points clés :

payload.commits?.length : optional chaining (?.) pour éviter les erreurs si payload.commits est undefined.

count > 1 ? 's' : '' : pluriel conditionnel. "1 commit" vs "3 commits".

default : fallback si on rencontre un type non géré.

🔹 5.5 — Les couleurs ANSI (sans lib)
javascript
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    // ...
};
💡 Comment ça marche :

\x1b[ : caractère d'échappement ANSI.

31m : "passe en rouge".

0m : "reset" (retour à la normale).

Exemple :

javascript
console.log(`${colors.red}Erreur${colors.reset}`);
Résultat : "Erreur" en rouge dans le terminal.

💡 Avantages :

Zéro dépendance (pas de chalk).

Fonctionne partout sur Linux/Mac/Windows 10+.

⚠️ Piège : si tu rediriges la sortie (github-activity x > file.txt), les codes ANSI apparaissent en clair. Pour éviter ça, on utiliserait process.stdout.isTTY.

🔹 5.6 — Le loader process.stdout
javascript
process.stdout.write(`${colors.gray}⏳ Récupération...${colors.reset}`);
// ... fetch ...
process.stdout.clearLine(0);
process.stdout.cursorTo(0);
💡 Décomposons :

process.stdout.write() : écrit sans saut de ligne (≠ console.log).

clearLine(0) : efface la ligne courante.

cursorTo(0) : replace le curseur au début.

Résultat : un loader qui disparaît quand le fetch est fini. Propre.

⚠️ clearLine n'existe que sur TTY (terminal interactif). Si tu rediriges, ça plante. Pour un vrai projet, on protégerait avec process.stdout.isTTY.

🔹 5.7 — Le format de date relatif
javascript
function formatRelativeTime(dateString) {
    const diffMs = new Date() - new Date(dateString);
    const diffMin = Math.floor(diffMs / 60000);
    // ...
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
Résultat : "2h ago", "3d ago", "15 min ago".

💡 Pourquoi ? Plus lisible que "2026-10-01T10:30:00Z".

Astuce : on pourrait utiliser Intl.RelativeTimeFormat (natif) pour des traductions, mais c'est plus complexe.

🔹 5.8 — La gestion du rate limit
javascript
if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
        const resetAt = response.headers.get('x-ratelimit-reset');
        const resetTime = new Date(parseInt(resetAt, 10) * 1000).toLocaleTimeString();
        throw new Error(`Rate limit GitHub atteint. Réinitialisation à ${resetTime}.`);
    }
    throw new Error(`Accès refusé par GitHub (HTTP 403).`);
}
💡 GitHub renvoie 2 headers utiles :

x-ratelimit-remaining : nombre de requêtes restantes.

x-ratelimit-reset : timestamp UNIX de réinitialisation.

Résultat : l'utilisateur sait quand il pourra réessayer. UX pro.

🔹 5.9 — Le regex de validation
javascript
const usernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
Décomposons :

^[a-z\d] : commence par une lettre ou un chiffre.

(?:[a-z\d]|-(?=[a-z\d])) : lettres, chiffres, ou tiret suivi d'un alphanumérique (pas de --).

{0,38} : longueur totale max 39.

/i : insensible à la casse.

💡 Résultat : on valide en local avant de faire une requête réseau inutile. Optimisation.

🔹 5.10 — Le try/catch au niveau du main
javascript
async function main() {
    try {
        const events = await fetchUserActivity(username);
        displayActivity(username, events);
    } catch (err) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
    }
}
💡 process.exit(1) : code de sortie non-zéro → signale une erreur au système.

Utilité : si tu utilises le CLI dans un script bash, tu peux faire :

bash
github-activity "$user" || echo "Échec pour $user"

Le pattern "CLI + API REST" :

1. ARGUMENTS
   const username = process.argv.slice(2)[0];

2. VALIDATION LOCALE
   if (!usernameRegex.test(username)) { ... }
   → Évite une requête réseau inutile

3. FETCH AVEC HEADERS
   const response = await fetch(url, {
       headers: {
           'Accept': 'application/vnd.github+json',
           'User-Agent': 'github-activity-cli',   ← OBLIGATOIRE
       },
   });

4. GESTION DES ERREURS HTTP
   if (response.status === 404) → "User not found"
   if (response.status === 403) → "Rate limit"
   if (response.status >= 500) → "Erreur serveur"
   if (!response.ok)           → "Erreur inattendue"

5. PARSER LE JSON
   const data = await response.json();

6. TRANSFORMER EN PHRASES
   switch (event.type) {
       case 'PushEvent': return `Pushed ${count} commits...`;
       ...
       default: return `${type} in ${repo}`;
   }

7. AFFICHER AVEC COULEURS
   const colors = { red: '\x1b[31m', reset: '\x1b[0m' };
   console.log(`${colors.red}Erreur${colors.reset}`);

8. WRAPPER TOUT DANS try/catch/finally

RÈGLES D'OR :
   - Header User-Agent OBLIGATOIRE pour GitHub
   - encodeURIComponent sur les entrées utilisateur
   - Optional chaining (?.length) pour les données API
   - Gérer 404, 403, 5xx séparément
   - process.exit(1) en cas d'erreur
   - Couleurs ANSI natives (pas de lib)

💡 Astuce de prof
Ce projet est LE pont entre le CLI et le web. Pourquoi ?

Côté CLI : arguments, fichier, structure.

Côté API : fetch, JSON, HTTP, erreurs réseau.

Côté UX : couleurs, emojis, loaders.

C'est exactement ce que fait un dev backend/fullstack au quotidien.

Les 3 règles à graver :
1. User-Agent OBLIGATOIRE pour GitHub. Sinon 403.

2. ?. (optional chaining) sur les données API. Elles ne sont jamais garanties.

3. Gérer 404, 403, 5xx séparément. Chaque code a un sens pour l'utilisateur.

Le test mental ultime :
Fais github-activity nonexistent-user-xyz.

Si tu vois "L'utilisateur n'existe pas" → parfait. ✅

Si tu vois une stack trace → mauvais. ❌

Si tu vois "HTTP 404" brut → moyen (l'utilisateur ne comprend pas).

Pour aller plus loin :
GitHub REST API Events : docs.github.com/en/rest/activity/events

GitHub Rate limits : docs.github.com/en/rest/overview/rate-limits

ANSI escape codes : en.wikipedia.org/wiki/ANSI_escape_code

Chalk (alternative pour les couleurs) : github.com/chalk/chalk


