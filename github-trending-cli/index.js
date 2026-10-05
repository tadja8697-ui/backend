#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Charge .env si présent (avant tout)
loadEnvFile();

// ============================================================
// 1. CONFIGURATION
// ============================================================

const API_BASE = 'https://api.github.com';

const DURATIONS = {
    day:   { days: 1,   label: 'today' },
    week:  { days: 7,   label: 'this week' },
    month: { days: 30,  label: 'this month' },
    year:  { days: 365, label: 'this year' },
};

const DEFAULTS = {
    duration: 'week',
    limit: 10,
    sort: 'stars',
    order: 'desc',
};

// Couleurs ANSI
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

// ============================================================
// 2. PARSER D'ARGUMENTS
// ============================================================

/**
 * Parse les arguments nommés : ['--duration', 'month', '--limit', '20']
 * → { duration: 'month', limit: '20' }
 */
function parseArgs(args) {
    const result = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        // Supporte --key=value
        if (arg.startsWith('--') && arg.includes('=')) {
            const [key, ...valueParts] = arg.slice(2).split('=');
            result[key] = valueParts.join('=');
            continue;
        }

        // Supporte --key value
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

        // Supporte -h, -v (raccourcis)
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

    // Duration
    if (opts.duration && !DURATIONS[opts.duration]) {
        errors.push(`--duration must be one of: ${Object.keys(DURATIONS).join(', ')}`);
    }

    // Limit
    if (opts.limit !== undefined) {
        const n = parseInt(opts.limit, 10);
        if (Number.isNaN(n) || n < 1 || n > 100) {
            errors.push('--limit must be a number between 1 and 100.');
        }
    }

    // Sort
    const validSorts = ['stars', 'forks', 'updated', 'help-wanted-issues'];
    if (opts.sort && !validSorts.includes(opts.sort)) {
        errors.push(`--sort must be one of: ${validSorts.join(', ')}`);
    }

    // Order
    if (opts.order && !['asc', 'desc'].includes(opts.order)) {
        errors.push('--order must be asc or desc.');
    }

    // Language
    if (opts.language && typeof opts.language !== 'string') {
        errors.push('--language must be a string.');
    }

    return errors;
}

// ============================================================
// 4. UTILITAIRES
// ============================================================

/**
 * Renvoie une date YYYY-MM-DD d'il y a N jours.
 */
function daysAgo(n) {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return date.toISOString().slice(0, 10);
}

/**
 * Formate un grand nombre : 158200 → "158.2k".
 */
function formatNumber(n) {
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toString();
}

/**
 * Tronque une chaîne à maxLen caractères.
 */
function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}

// ============================================================
// 5. FETCH GITHUB API
// ============================================================

/**
 * Récupère les repos trending.
 */
async function fetchTrending({ duration, limit, sort, order, language }) {
    const sinceDate = daysAgo(DURATIONS[duration].days);

    // Construire la query
    let q = `created:>${sinceDate}`;
    if (language) {
        q += `+language:${language}`;
    }

    const url = new URL(`${API_BASE}/search/repositories`);
    url.searchParams.set('q', q);
    url.searchParams.set('sort', sort);
    url.searchParams.set('order', order);
    url.searchParams.set('per_page', String(limit));

    // Headers
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'trending-repos-cli',
    };

    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    let response;
    try {
        response = await fetch(url.toString(), { headers });
    } catch (err) {
        throw new Error('Cannot reach GitHub API. Check your connection.');
    }

    // ---------- Gestion des codes HTTP ----------
    if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const reset = response.headers.get('x-ratelimit-reset');

        if (remaining === '0') {
            const resetTime = reset
                ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString()
                : 'unknown';
            throw new Error(`GitHub rate limit reached. Try again at ${resetTime}.`);
        }
        throw new Error('GitHub API access forbidden. Add a GITHUB_TOKEN to increase limits.');
    }

    if (response.status === 422) {
        throw new Error('Invalid search query. Check your --language or other options.');
    }

    if (response.status >= 500) {
        throw new Error(`GitHub server error (HTTP ${response.status}). Try again later.`);
    }

    if (!response.ok) {
        throw new Error(`Unexpected error from GitHub (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Unexpected response format from GitHub.');
    }

    return data.items;
}

// ============================================================
// 6. AFFICHAGE
// ============================================================

function printHeader(opts) {
    const durationLabel = DURATIONS[opts.duration].label;
    console.log(`\n${c.bold}${c.magenta}🔥 GitHub Trending Repositories${c.reset}`);
    console.log(`${c.dim}   ${durationLabel}  •  top ${opts.limit} by ${opts.sort}${opts.language ? `  •  ${opts.language}` : ''}${c.reset}\n`);
}

function printRepoList(repos) {
    // Largeurs des colonnes
    const W = {
        rank: 4,
        name: 35,
        stars: 10,
        lang: 12,
        desc: 40,
    };

    // En-tête
    console.log(
        c.bold +
        '#'.padEnd(W.rank) +
        'Repository'.padEnd(W.name) +
        '⭐ Stars'.padStart(W.stars) + '  ' +
        'Language'.padEnd(W.lang) +
        'Description' +
        c.reset
    );
    console.log(c.gray + '─'.repeat(120) + c.reset);

    // Lignes
    repos.forEach((repo, index) => {
        const rank = String(index + 1).padEnd(W.rank);
        const name = truncate(repo.full_name, W.name - 2).padEnd(W.name);
        const stars = formatNumber(repo.stargazers_count).padStart(W.stars);
        const lang = truncate(repo.language || '—', W.lang - 2).padEnd(W.lang);
        const desc = truncate(repo.description || 'No description', W.desc);

        console.log(
            `${c.cyan}${rank}${c.reset}` +
            `${c.bold}${name}${c.reset}` +
            `${c.yellow}${stars}${c.reset}  ` +
            `${c.green}${lang}${c.reset}` +
            `${c.dim}${desc}${c.reset}`
        );
    });

    console.log(c.gray + '─'.repeat(120) + c.reset);
    console.log(`${c.dim}   Total: ${repos.length} repositories${c.reset}\n`);
}

function printHelp() {
    console.log(`
${c.bold}GitHub Trending CLI${c.reset}

${c.cyan}Usage:${c.reset}
  trending-repos [options]

${c.cyan}Options:${c.reset}
  --duration <day|week|month|year>   Time range (default: week)
  --limit <number>                   Number of repos (1-100, default: 10)
  --sort <stars|forks|updated>       Sort field (default: stars)
  --order <asc|desc>                 Sort order (default: desc)
  --language <name>                  Filter by programming language
  -h, --help                         Show this help
  -v, --version                      Show version

${c.cyan}Examples:${c.reset}
  trending-repos
  trending-repos --duration month --limit 20
  trending-repos --language javascript --duration week
  trending-repos --duration year --sort forks --limit 5

${c.cyan}Environment:${c.reset}
  GITHUB_TOKEN   Optional. Increase API rate limits.

${c.cyan}Note:${c.reset}
  GitHub Search API has strict rate limits:
  - Without token: 10 requests per minute
  - With token:    30 requests per minute
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
        console.log('trending-repos v1.0.0');
        return;
    }

    // Fusionner avec les défauts
    const opts = {
        duration: args.duration || DEFAULTS.duration,
        limit: parseInt(args.limit, 10) || DEFAULTS.limit,
        sort: args.sort || DEFAULTS.sort,
        order: args.order || DEFAULTS.order,
        language: args.language || null,
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
    process.stdout.write(`${c.dim}⏳ Fetching trending repositories...${c.reset}`);

    try {
        const repos = await fetchTrending(opts);

        // Efface le loader
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);

        if (repos.length === 0) {
            console.log(`\n${c.yellow}📭 No repositories found for these criteria.${c.reset}\n`);
            return;
        }

        printHeader(opts);
        printRepoList(repos);
    } catch (err) {
        // Efface le loader
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