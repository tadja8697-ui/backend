🎯 ÉTAPE 4 : Explication détaillée
🔹 4.1 — Le mapping type → endpoint
javascript
const TYPES = {
    playing:  { endpoint: '/movie/now_playing', label: 'Now Playing',   emoji: '🎬' },
    popular:  { endpoint: '/movie/popular',     label: 'Popular',       emoji: '🔥' },
    top:      { endpoint: '/movie/top_rated',   label: 'Top Rated',     emoji: '⭐' },
    upcoming: { endpoint: '/movie/upcoming',    label: 'Upcoming',      emoji: '📅' },
};
💡 Pattern : on centralise toutes les infos d'un type dans un objet.

endpoint : pour la requête.

label : pour l'affichage.

emoji : pour le fun.

Résultat : ajouter un nouveau type = 1 ligne. Pro.

🔹 4.2 — Le token en Bearer
javascript
const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
};
⚠️ Piège : TMDB propose 2 tokens :

API Key (32 chars) → s'utilise en query param.

Read Access Token (JWT) → s'utilise en Bearer.

Si tu utilises le mauvais → 401.

Comment savoir lequel tu as ?

Commence par eyJ... → JWT ✅.

Chaîne hexadécimale → API Key.

🔹 4.3 — La gestion des 4xx/5xx
javascript
if (response.status === 401) { ... }   // Token invalide
if (response.status === 404) { ... }   // Endpoint invalide
if (response.status === 429) { ... }   // Rate limit
if (response.status >= 500) { ... }    // TMDB down
💡 Chaque code a un message spécifique :

401 → "Check your .env".

404 → "Invalid movie type".

429 → "Try again in Xs" (avec header retry-after).

🔹 4.4 — La troncature des textes
javascript
const title = truncate(movie.title, 45).padEnd(46, ' ');
const overview = truncate(movie.overview, 100);
💡 Pourquoi padEnd(46, ' ') sur le titre ?

Le titre tronqué fait ≤ 45 chars.

padEnd(46) ajoute des espaces → largeur fixe.

Résultat : tous les titres ont la même largeur → alignement parfait du ⭐.

Sans padEnd :

text
1. Short Title ⭐ 8.5
2. A Very Long Title That Was Truncated... ⭐ 7.2    ← décalé
Avec padEnd :

text
1. Short Title                          ⭐ 8.5
2. A Very Long Title That Was Truncated ⭐ 7.2
🔹 4.5 — La couleur selon la note
javascript
function formatRating(rating) {
    const rounded = rating.toFixed(1);
    if (rating >= 8) return `${c.green}${rounded}${c.reset}`;   // Vert
    if (rating >= 6) return `${c.yellow}${rounded}${c.reset}`;  // Jaune
    return `${c.red}${rounded}${c.reset}`;                       // Rouge
}
💡 UX : un coup d'œil suffit pour repérer les bons films.

Note	Couleur
≥ 8	🟢 Vert
6-8	🟡 Jaune
< 6	🔴 Rouge
🔹 4.6 — Le formatage des dates
javascript
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
Résultat :

"2010-07-16" → "Jul 16, 2010".

"" → "—".

"invalid" → "—".

💡 Robustesse : 3 cas gérés.

🔹 4.7 — La pagination
javascript
url.searchParams.set('page', String(page));
TMDB supporte jusqu'à 500 pages par endpoint. On limite la validation à 1-500.

Test :

bash
tmdb-app --type popular --page 2
🔹 4.8 — Le multi-langage
javascript
url.searchParams.set('language', language);
Codes de langage :

en-US : anglais (US).

fr-FR : français.

es-ES : espagnol.

ja-JP : japonais.

Bonus : les titres et descriptions sont traduits dans la langue demandée.

🔹 4.9 — L'affichage multi-lignes par film
javascript
console.log(`${c.cyan}${rank}.${c.reset} ${c.bold}${title}${c.reset} ⭐ ${rating}`);
console.log(`    ${c.dim}📅 ${date}${c.reset}`);
console.log(`    ${c.dim}${overview}${c.reset}\n`);
Résultat :

text
 1. Inception                                     ⭐ 8.4 (35k votes)
    📅 Jul 16, 2010
    A thief who steals corporate secrets through dream-sharing...

 2. The Dark Knight                               ⭐ 9.0 (32k votes)
    📅 Jul 18, 2008
    When the menace known as the Joker wreaks havoc on Gotham...
💡 3 lignes par film : plus lisible qu'une ligne géante.

🔹 4.10 — Le help intégré
javascript
if (!args.type) {
    printHelp();
    return;
}
💡 UX : si l'utilisateur tape tmdb-app sans argument, il voit l'aide au lieu d'une erreur. Plus friendly.

# TMDB CLI — Browse movies from your terminal

A command-line tool to browse movies from The Movie Database (TMDB).

## ✨ Features

- 🎬 4 categories: now playing, popular, top rated, upcoming
- 🌍 Multi-language support (20+ languages)
- 📄 Pagination (up to 500 pages per category)
- ⭐ Ratings with color coding
- 🎨 Beautiful terminal output

## 🚀 Installation

### Prerequisites

- Node.js 18 or higher
- A free TMDB account

### Setup

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/tadja8697-ui/frontend-exercises
   cd 41-tmdb-cli
   \`\`\`

2. Install dependencies (none required):
   \`\`\`bash
   npm install
   \`\`\`

3. Get your TMDB token:
   - Sign up at https://www.themoviedb.org/signup
   - Go to https://www.themoviedb.org/settings/api
   - Copy your "API Read Access Token" (long JWT starting with \`eyJ\`)

4. Create a \`.env\` file:
   \`\`\`
   TMDB_TOKEN=your_token_here
   \`\`\`

5. Link the CLI globally:
   \`\`\`bash
   chmod +x index.js
   npm link
   \`\`\`

## 📖 Usage

\`\`\`bash
tmdb-app --type <type> [options]
\`\`\`

### Types

| Type | Description |
|------|-------------|
| \`playing\` | Movies currently in theaters |
| \`popular\` | Popular movies right now |
| \`top\` | Top-rated movies of all time |
| \`upcoming\` | Movies coming soon |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| \`--type\` | \`popular\` | Movie category |
| \`--language\` | \`en-US\` | Language code (e.g. \`fr-FR\`, \`es-ES\`) |
| \`--page\` | \`1\` | Page number (1-500) |
| \`-h, --help\` | — | Show help |
| \`-v, --version\` | — | Show version |

### Examples

\`\`\`bash
# Popular movies (default)
tmdb-app --type popular

# Top rated, page 2
tmdb-app --type top --page 2

# Upcoming movies in French
tmdb-app --type upcoming --language fr-FR

# Now playing in Spanish
tmdb-app --type playing --language es-ES
\`\`\`

## 🎬 Screenshots

\`\`\`
🔥  TMDB — Popular Movies
   Page 1 of 500  •  10000 results total

 1. Deadpool & Wolverine                          ⭐ 7.6 (5k votes)
    📅 Jul 24, 2024
    A listless Wade Wilson toils away in civilian life...
\`\`\`

## 🔒 Security

Never commit your \`.env\` file. It contains your personal TMDB token.

## 🛠 Tech Stack

- Node.js 18+
- Native \`fetch\` (no dependencies)
- ANSI colors for terminal output

## 📝 License

MIT

Le pattern "TMDB CLI" :

1. TYPES → ENDPOINTS
   const TYPES = {
     playing:  { endpoint: '/movie/now_playing', label: 'Now Playing', emoji: '🎬' },
     popular:  { endpoint: '/movie/popular',     label: 'Popular',     emoji: '🔥' },
     top:      { endpoint: '/movie/top_rated',   label: 'Top Rated',   emoji: '⭐' },
     upcoming: { endpoint: '/movie/upcoming',    label: 'Upcoming',    emoji: '📅' },
   };

2. AUTH BEARER
   headers: {
     'Accept': 'application/json',
     'Authorization': `Bearer ${process.env.TMDB_TOKEN}`,
   }

3. PARAMS
   ?language=fr-FR&page=1

4. AFFICHAGE (3 lignes/film)
   1. Titre tronqué (45 chars) ⭐ 8.5 (35k votes)
      📅 Jul 16, 2010
      Résumé tronqué (100 chars)

5. COULEURS RATING
   ≥ 8 → vert
   ≥ 6 → jaune
   < 6 → rouge

RÈGLES D'OR :
   - Token TMDB = JWT (Bearer), pas API Key
   - Token dans .env, JAMAIS en clair
   - Accept: application/json TOUJOURS
   - page max 500
   - Fallback '—' pour les champs vides
   - truncate + padEnd pour aligner
   - clearLine + cursorTo pour le loader
   - Toujours un --help

