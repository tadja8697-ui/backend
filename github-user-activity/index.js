#!/usr/bin/env node

// ============================================================
// 1. CONFIGURATION
// ============================================================

const API_BASE = 'https://api.github.com';
const MAX_EVENTS = 30;   // GitHub renvoie ~30 events par défaut

// ============================================================
// 2. UTILITAIRES D'AFFICHAGE
// ============================================================

// Couleurs ANSI (pas de lib externe)
const colors = {
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

// Emoji par type d'event
const EVENT_EMOJI = {
    PushEvent: '📦',
    IssuesEvent: '🐛',
    WatchEvent: '⭐',
    ForkEvent: '🍴',
    CreateEvent: '🌱',
    DeleteEvent: '🗑️',
    PullRequestEvent: '🔀',
    IssueCommentEvent: '💬',
    PullRequestReviewEvent: '👀',
    ReleaseEvent: '🏷️',
    PublicEvent: '🌐',
    GollumEvent: '📚',
    MemberEvent: '👥',
};

// ============================================================
// 3. TRADUIRE UN EVENT EN PHRASE LISIBLE
// ============================================================

/**
 * Transforme un event GitHub en phrase lisible.
 * @param {Object} event
 * @returns {string}
 */
function formatEvent(event) {
    const repo = event.repo.name;
    const payload = event.payload || {};
    const type = event.type;

    switch (type) {
        case 'PushEvent': {
            const count = payload.commits?.length || 0;
            const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
            return `Pushed ${count} commit${count > 1 ? 's' : ''} to ${repo} (${branch})`;
        }

        case 'IssuesEvent': {
            const action = payload.action || 'updated';
            const number = payload.issue?.number;
            const title = payload.issue?.title || '';
            return `${capitalize(action)} issue #${number} in ${repo}: "${truncate(title, 50)}"`;
        }

        case 'WatchEvent': {
            return `Starred ${repo}`;
        }

        case 'ForkEvent': {
            return `Forked ${repo}`;
        }

        case 'CreateEvent': {
            const refType = payload.ref_type || 'repository';
            const ref = payload.ref ? ` "${payload.ref}"` : '';
            return `Created ${refType}${ref} in ${repo}`;
        }

        case 'DeleteEvent': {
            const refType = payload.ref_type || 'ref';
            const ref = payload.ref || '';
            return `Deleted ${refType} "${ref}" in ${repo}`;
        }

        case 'PullRequestEvent': {
            const action = payload.action || 'updated';
            const number = payload.pull_request?.number;
            const title = payload.pull_request?.title || '';
            return `${capitalize(action)} pull request #${number} in ${repo}: "${truncate(title, 50)}"`;
        }

        case 'IssueCommentEvent': {
            const number = payload.issue?.number;
            return `Commented on issue #${number} in ${repo}`;
        }

        case 'PullRequestReviewEvent': {
            const number = payload.pull_request?.number;
            return `Reviewed pull request #${number} in ${repo}`;
        }

        case 'ReleaseEvent': {
            const tag = payload.release?.tag_name || '';
            return `Published release "${tag}" in ${repo}`;
        }

        case 'PublicEvent': {
            return `Made ${repo} public`;
        }

        case 'GollumEvent': {
            return `Updated the wiki in ${repo}`;
        }

        case 'MemberEvent': {
            const action = payload.action || 'updated';
            return `${capitalize(action)} a collaborator in ${repo}`;
        }

        default: {
            // Fallback : on affiche le type brut
            return `${type.replace('Event', '')} in ${repo}`;
        }
    }
}

/**
 * Met la 1ère lettre en majuscule.
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Coupe une string si elle est trop longue.
 */
function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 1) + '…';
}

/**
 * Affiche la date relative ("il y a 2 heures").
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// ============================================================
// 4. FETCH DE L'API GITHUB
// ============================================================

/**
 * Récupère les events d'un utilisateur GitHub.
 * @param {string} username
 * @returns {Promise<Array>}
 */
async function fetchUserActivity(username) {
    const url = `${API_BASE}/users/${encodeURIComponent(username)}/events?per_page=${MAX_EVENTS}`;

    let response;
    try {
        response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'github-activity-cli',
            },
        });
    } catch (err) {
        throw new Error(`Impossible de contacter l'API GitHub. Vérifiez votre connexion.`);
    }

    // ---------- GESTION DES CODES HTTP ----------
    if (response.status === 404) {
        throw new Error(`L'utilisateur "${username}" n'existe pas sur GitHub.`);
    }

    if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining === '0') {
            const resetAt = response.headers.get('x-ratelimit-reset');
            const resetTime = resetAt
                ? new Date(parseInt(resetAt, 10) * 1000).toLocaleTimeString()
                : 'inconnue';
            throw new Error(`Rate limit GitHub atteint. Réinitialisation à ${resetTime}.`);
        }
        throw new Error(`Accès refusé par GitHub (HTTP 403).`);
    }

    if (response.status >= 500) {
        throw new Error(`Erreur serveur GitHub (HTTP ${response.status}). Réessayez plus tard.`);
    }

    if (!response.ok) {
        throw new Error(`Erreur inattendue (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error(`Réponse invalide de l'API GitHub.`);
    }

    return data;
}

// ============================================================
// 5. AFFICHAGE PRINCIPAL
// ============================================================

/**
 * Affiche l'activité d'un utilisateur dans le terminal.
 * @param {string} username
 * @param {Array} events
 */
function displayActivity(username, events) {
    if (events.length === 0) {
        console.log(`\n${colors.yellow}ℹ️  Aucune activité récente pour ${colors.bold}${username}${colors.reset}${colors.yellow}.${colors.reset}\n`);
        return;
    }

    const header = `Activité récente de ${username}`;
    console.log(`\n${colors.bold}${colors.cyan}${header}${colors.reset}`);
    console.log(`${colors.gray}${'─'.repeat(header.length)}${colors.reset}\n`);

    events.forEach((event) => {
        const emoji = EVENT_EMOJI[event.type] || '•';
        const description = formatEvent(event);
        const time = formatRelativeTime(event.created_at);

        console.log(
            `  ${emoji}  ${colors.green}${description}${colors.reset}` +
            `\n     ${colors.gray}${time}${colors.reset}\n`
        );
    });

    console.log(`${colors.gray}Total : ${events.length} événement(s) affiché(s).${colors.reset}\n`);
}

// ============================================================
// 6. AIDE
// ============================================================

function printHelp() {
    console.log(`
${colors.bold}GitHub User Activity CLI${colors.reset}

${colors.cyan}Usage :${colors.reset}
  github-activity <username>     Afficher l'activité récente d'un utilisateur

${colors.cyan}Exemples :${colors.reset}
  github-activity kamranahmedse
  github-activity torvalds

${colors.cyan}Options :${colors.reset}
  -h, --help                     Afficher cette aide
  -v, --version                  Afficher la version
`);
}

// ============================================================
// 7. POINT D'ENTRÉE
// ============================================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Aide / version / aucune commande
    if (!command || command === '-h' || command === '--help' || command === 'help') {
        printHelp();
        return;
    }

    if (command === '-v' || command === '--version') {
        console.log('github-activity v1.0.0');
        return;
    }

    // Le 1er argument est le username
    const username = command;

    // Validation basique du username (règles GitHub)
    const usernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
    if (!usernameRegex.test(username)) {
        console.error(`${colors.red}❌ Nom d'utilisateur invalide : "${username}".${colors.reset}`);
        console.error(`${colors.gray}   Les noms GitHub ne contiennent que des lettres, chiffres et tirets.${colors.reset}`);
        process.exit(1);
    }

    // Loader
    process.stdout.write(`${colors.gray}⏳ Récupération de l'activité de ${username}...${colors.reset}`);

    try {
        const events = await fetchUserActivity(username);

        // Efface la ligne du loader
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);

        displayActivity(username, events);
    } catch (err) {
        // Efface la ligne du loader
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);

        console.error(`\n${colors.red}❌ ${err.message}${colors.reset}\n`);
        process.exit(1);
    }
}

main();