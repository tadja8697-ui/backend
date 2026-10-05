#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Charge .env AVANT tout
loadEnvFile();

// ============================================================
// 1. CONFIGURATION
// ============================================================

const API_BASE = 'https://api.themoviedb.org/3';

// Mapping type → endpoint TMDB + label
const TYPES = {
    playing:  { endpoint: '/movie/now_playing', label: 'Now Playing',   emoji: '🎬' },
    popular:  { endpoint: '/movie/popular',     label: 'Popular',       emoji: '🔥' },
    top:      { endpoint: '/movie/top_rated',   label: 'Top Rated',     emoji: '⭐' },
    upcoming: { endpoint: '/movie/upcoming',    label: 'Upcoming',      emoji: '📅' },
};

const DEFAULTS = {
    type: 'popular',
    language: 'en-US',
    page: 1,
};

// Couleurs ANSI
const c = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    gray:    '\x1b[90m',
};

// ============================================================
// 2. PARSER D'ARGUMENTS
// ============================================================

function parseArgs(args) {
    const result = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        // --key=value
        if (arg.startsWith('--') && arg.includes('=')) {
            const [key, ...rest] = arg.slice(2).split('=');
            result[key] = rest.join('=');
            continue;
        }

        // --key value
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next !== undefined && !next.startsWith('--')) {
                result[key] = next;
                i++;
            } else {
                result[key] = true;
            }
            continue;
        }

        // Raccourcis
        if (arg === '-h') result.help = true;
        if (arg === '-v') result.version = true;
    }

    return result;
}

// ============================================================
// 3. VALIDATION
// ============================================================

function validateOptions(opts) {
    const errors = [];

    if (!TYPES[opts.type]) {
        errors.push(`--type must be one of: ${Object.keys(TYPES).join(', ')}`);
    }

    if (opts.page !== undefined) {
        const n = parseInt(opts.page, 10);
        if (Number.isNaN(n) || n < 1 || n > 500) {
            errors.push('--page must be a number between 1 and 500.');
        }
    }

    return errors;
}

// ============================================================
// 4. UTILITAIRES
// ============================================================

/**
 * Tronque une chaîne à maxLen caractères.
 */
function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}

/**
 * Formate une note (0-10) avec une couleur.
 */
function formatRating(rating) {
    const rounded = rating.toFixed(1);
    if (rating >= 8) return `${c.green}${rounded}${c.reset}`;
    if (rating >= 6) return `${c.yellow}${rounded}${c.reset}`;
    return `${c.red}${rounded}${c.reset}`;
}

/**
 * Formate une date YYYY-MM-DD → "Jul 16, 2010" ou "—" si vide.
 */
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

/**
 * Formate un grand nombre : 35000 → "35k".
 */
function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toString();
}

// ============================================================
// 5. FETCH TMDB
// ============================================================

/**
 * Récupère la liste des films depuis TMDB.
 */
async function fetchMovies({ type, language, page }) {
    const token = process.env.TMDB_TOKEN;

    if (!token) {
        throw new Error(
            'TMDB_TOKEN is not set. Add it to your .env file.\n' +
            '   Get one at: https://www.themoviedb.org/settings/api'
        );
    }

    const { endpoint } = TYPES[type];

    const url = new URL(`${API_BASE}${endpoint}`);
    url.searchParams.set('language', language);
    url.searchParams.set('page', String(page));

    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    let response;
    try {
        response = await fetch(url.toString(), { headers });
    } catch (err) {
        throw new Error('Cannot reach TMDB API. Check your connection.');
    }

    // ---------- Gestion des codes HTTP ----------
    if (response.status === 401) {
        throw new Error('Invalid TMDB token. Check your .env file.');
    }

    if (response.status === 404) {
        throw new Error('TMDB resource not found. Invalid movie type?');
    }

    if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        const wait = retry ? `Try again in ${retry}s.` : 'Try again later.';
        throw new Error(`TMDB rate limit reached. ${wait}`);
    }

    if (response.status >= 500) {
        throw new Error(`TMDB server error (HTTP ${response.status}). Try again later.`);
    }

    if (!response.ok) {
        throw new Error(`Unexpected error from TMDB (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Unexpected response format from TMDB.');
    }

    return data;
}

// ============================================================
// 6. AFFICHAGE
// ============================================================

function printHeader(opts, totalResults, totalPages) {
    const { label, emoji } = TYPES[opts.type];

    console.log(`\n${c.bold}${c.magenta}${emoji}  TMDB — ${label} Movies${c.reset}`);
    console.log(
        `${c.dim}   Page ${opts.page} of ${totalPages}  •  ${formatNumber(totalResults)} results total${c.reset}\n`
    );
}

function printMovieList(movies) {
    if (movies.length === 0) {
        console.log(`${c.yellow}📭 No movies found.${c.reset}\n`);
        return;
    }

    movies.forEach((movie, index) => {
        const rank = String(index + 1).padStart(2, ' ');
        const title = truncate(movie.title || 'Untitled', 45).padEnd(46, ' ');
        const rating = formatRating(movie.vote_average || 0);
        const votes = formatNumber(movie.vote_count || 0);
        const date = formatDate(movie.release_date);
        const overview = truncate(movie.overview || 'No description available.', 100);

        console.log(
            `${c.cyan}${rank}.${c.reset} ` +
            `${c.bold}${title}${c.reset} ` +
            `⭐ ${rating} ${c.gray}(${votes} votes)${c.reset}`
        );
        console.log(
            `    ${c.dim}📅 ${date}${c.reset}`
        );
        console.log(
            `    ${c.dim}${overview}${c.reset}\n`
        );
    });

    console.log(
        `${c.gray}   Showing ${movies.length} movies on this page.${c.reset}\n`
    );
}

function printHelp() {
    console.log(`
${c.bold}TMDB CLI — Browse movies from The Movie Database${c.reset}

${c.cyan}Usage:${c.reset}
  tmdb-app --type <type> [options]

${c.cyan}Types:${c.reset}
  playing    🎬  Movies currently in theaters
  popular    🔥  Popular movies right now
  top        ⭐  Top-rated movies of all time
  upcoming   📅  Movies coming soon

${c.cyan}Options:${c.reset}
  --type <type>          Movie category (default: popular)
  --language <code>      Language code (default: en-US)
                         Examples: fr-FR, es-ES, de-DE
  --page <number>        Page number (1-500, default: 1)
  -h, --help             Show this help
  -v, --version          Show version

${c.cyan}Examples:${c.reset}
  tmdb-app --type popular
  tmdb-app --type top --page 2
  tmdb-app --type upcoming --language fr-FR

${c.cyan}Setup:${c.reset}
  Add your TMDB token to a .env file:

  ${c.gray}TMDB_TOKEN=your_token_here${c.reset}

  Get one at: ${c.blue}https://www.themoviedb.org/settings/api${c.reset}
`);
}

// ============================================================
// 7. POINT D'ENTRÉE
// ============================================================

async function main() {
    const args = parseArgs(process.argv.slice(2));

    // Help / version
    if (args.help) {
        printHelp();
        return;
    }

    if (args.version) {
        console.log('tmdb-cli v1.0.0');
        return;
    }

    // Pas de --type → help
    if (!args.type) {
        printHelp();
        return;
    }

    const opts = {
        type:     args.type,
        language: args.language || DEFAULTS.language,
        page:     parseInt(args.page, 10) || DEFAULTS.page,
    };

    // Validation
    const errors = validateOptions(opts);
    if (errors.length > 0) {
        console.error(`\n${c.red}❌ Invalid options:${c.reset}`);
        errors.forEach((e) => console.error(`   • ${e}`));
        console.error(`\n${c.dim}Run with --help to see usage.${c.reset}\n`);
        process.exit(1);
    }

    // Loader
    process.stdout.write(`${c.dim}⏳ Fetching movies from TMDB...${c.reset}`);

    try {
        const data = await fetchMovies(opts);

        // Efface le loader
        try {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        } catch {}

        printHeader(opts, data.total_results, data.total_pages);
        printMovieList(data.results);
    } catch (err) {
        try {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        } catch {}

        console.error(`\n${c.red}❌ ${err.message}${c.reset}\n`);
        process.exit(1);
    }
}

main();

// ============================================================
// HELPER : charger .env
// ============================================================

function loadEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;

        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();

        if (!process.env[key]) process.env[key] = value;
    }
}