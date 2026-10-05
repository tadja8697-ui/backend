import { marked } from 'marked';

// Configuration de marked
marked.setOptions({
    gfm: true,           // GitHub Flavored Markdown
    breaks: true,        // Les \n deviennent des <br>
    headerIds: false,    // Pas d'id auto sur les titres
    mangle: false,       // Ne pas encoder les emails
});

/**
 * Convertit du Markdown en HTML.
 * @param {string} markdown
 * @returns {string} HTML
 */
export function renderMarkdown(markdown) {
    if (!markdown || typeof markdown !== 'string') return '';
    return marked.parse(markdown);
}

/**
 * Extrait le titre depuis le Markdown.
 * Priorité : premier # Titre, sinon première ligne non vide.
 * @param {string} markdown
 * @returns {string}
 */
export function extractTitle(markdown) {
    if (!markdown) return 'Untitled';

    // Cherche un titre H1
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1].trim().slice(0, 200);

    // Sinon, première ligne non vide
    const firstLine = markdown
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.length > 0);

    return firstLine ? firstLine.slice(0, 200) : 'Untitled';
}

/**
 * Compte les statistiques du Markdown.
 * @param {string} markdown
 * @returns {Object}
 */
export function getMarkdownStats(markdown) {
    if (!markdown) {
        return { words: 0, characters: 0, lines: 0 };
    }

    return {
        words: markdown.trim().split(/\s+/).filter(Boolean).length,
        characters: markdown.length,
        lines: markdown.split('\n').length,
    };
}