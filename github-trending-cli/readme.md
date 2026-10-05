🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le parser d'arguments (avec --key=value)
javascript
if (arg.startsWith('--') && arg.includes('=')) {
    const [key, ...valueParts] = arg.slice(2).split('=');
    result[key] = valueParts.join('=');
    continue;
}
💡 Utilité : supporte les 2 syntaxes :

--duration month (espace).

--duration=month (égal).

Pourquoi valueParts.join('=') ? Si la valeur contient un =, on veut tout garder. Ex: --name=a=b → a=b.

🔹 5.2 — Le calcul de date
javascript
function daysAgo(n) {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return date.toISOString().slice(0, 10);
}
Décomposons avec daysAgo(7) le 4 octobre 2026 :

new Date() → 2026-10-04T....

date.setDate(date.getDate() - 7) → setDate(27) → 2026-09-27.

.toISOString() → "2026-09-27T...".

.slice(0, 10) → "2026-09-27".

💡 setDate() gère les mois : setDate(0) → dernier jour du mois précédent.

🔹 5.3 — La construction d'URL avec URL
javascript
const url = new URL(`${API_BASE}/search/repositories`);
url.searchParams.set('q', q);
url.searchParams.set('sort', sort);
url.searchParams.set('order', order);
url.searchParams.set('per_page', String(limit));
💡 URL + searchParams : encode automatiquement les caractères spéciaux.

Résultat :

text
https://api.github.com/search/repositories?q=created%3A%3E2026-09-27&sort=stars&order=desc&per_page=10
⚠️ Important : le : devient %3A et > devient %3E → GitHub accepte les 2 formes.

🔹 5.4 — La gestion fine du 403
javascript
if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
        // Rate limit atteint
        const reset = response.headers.get('x-ratelimit-reset');
        const resetTime = new Date(parseInt(reset, 10) * 1000).toLocaleTimeString();
        throw new Error(`Rate limit reached. Try again at ${resetTime}.`);
    }
    // 403 sans rate limit → token invalide
    throw new Error('Access forbidden. Add a GITHUB_TOKEN.');
}
💡 2 cas de 403 :

Rate limit : headers x-ratelimit-* présents.

Accès refusé : token invalide ou politique.

Message précis → l'utilisateur sait quoi faire.

🔹 5.5 — Le tableau aligné avec padEnd + padStart
javascript
console.log(
    '#'.padEnd(W.rank) +
    'Repository'.padEnd(W.name) +
    '⭐ Stars'.padStart(W.stars) + '  ' +
    'Language'.padEnd(W.lang) +
    'Description'
);
Méthode	Résultat
.padEnd(n)	Ajoute des espaces à droite (texte aligné à gauche)
.padStart(n)	Ajoute des espaces à gauche (texte aligné à droite)
💡 Pour les nombres : padStart → aligné à droite, plus lisible.

Résultat :

text
#   Repository                          ⭐ Stars  Language    Description
1   microsoft/vscode                     158.2k  TypeScript  Visual Studio Code
2   facebook/react                        227k  JavaScript  The library for web...
🔹 5.6 — Le loader qui disparaît
javascript
process.stdout.write(`${c.dim}⏳ Fetching...${c.reset}`);
// ... fetch ...
process.stdout.clearLine(0);
process.stdout.cursorTo(0);
💡 Décomposons :

process.stdout.write() : écrit sans retour à la ligne.

clearLine(0) : efface la ligne courante.

cursorTo(0) : replace le curseur au début.

Résultat : un loader qui disparaît proprement.

⚠️ Piège : clearLine n'existe que sur un terminal interactif (TTY). Si tu rediriges (> file.txt), ça plante. D'où le try/catch dans notre code.

🔹 5.7 — Le support du GITHUB_TOKEN
javascript
if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
}
💡 Utilité : passe de 10 req/min à 30 req/min.

Comment créer un token :

github.com/settings/tokens.

Generate new token (classic).

Scopes : rien de spécial (juste public_repo suffit).

Copie dans .env.

🔹 5.8 — Le truncate() pour les longues descriptions
javascript
function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}
💡 Utilité : garde les colonnes alignées même si une description est longue.

Exemple :

"Visual Studio Code is a code editor..." (200 chars).

truncate(desc, 40) → "Visual Studio Code is a code edi…".

🔹 5.9 — Le tri par défaut (stars desc)
javascript
url.searchParams.set('sort', 'stars');
url.searchParams.set('order', 'desc');
💡 Pourquoi desc ? On veut les plus populaires en premier.

⚠️ Piège : si tu mets order=asc, tu verras les moins populaires. Toujours desc pour trending.

🔹 5.10 — Le tri côté client (bonus)
L'API trie déjà, mais tu peux re-trier pour être sûr :

javascript
repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
Utile si :

Tu combines plusieurs sources.

Tu veux un tri custom (ex: par ratio stars/âge).

Le pattern "GitHub Trending CLI" :

1. ARGUMENTS
   --duration day|week|month|year (défaut: week)
   --limit N (1-100, défaut: 10)
   --sort stars|forks|updated (défaut: stars)
   --order asc|desc (défaut: desc)
   --language <name> (défaut: tous)
   Supporte --key=value ET --key value

2. DATE
   daysAgo(n) → setDate + toISOString().slice(0, 10)

3. REQUÊTE
   URL + searchParams (encode auto)
   q=created:>YYYY-MM-DD[+language:xxx]
   sort=stars&order=desc&per_page=N
   Headers: Accept + User-Agent + [Authorization]

4. GESTION ERREURS
   403 + x-ratelimit-remaining=0 → rate limit
   403 sans header               → token
   422                           → query invalide
   5xx                           → GitHub down

5. AFFICHAGE
   padEnd pour texte (gauche)
   padStart pour nombres (droite)
   formatNumber: 158200 → "158.2k"
   truncate: description à 40 chars

RÈGLES D'OR :
   - User-Agent OBLIGATOIRE (sinon 403)
   - per_page max 100
   - order=desc TOUJOURS pour trending
   - Toujours try/catch autour de fetch
   - Loader avec clearLine (try/catch TTY)
   - GITHUB_TOKEN dans .env (optionnel)