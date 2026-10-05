import writeGood from 'write-good';

/**
 * Analyse un texte et retourne des suggestions.
 * @param {string} text
 * @returns {{ suggestions: Array, score: number }}
 */
export function checkGrammar(text) {
    if (!text || typeof text !== 'string') {
        return { suggestions: [], score: 100 };
    }

    // Nettoyer le Markdown pour ne pas analyser la syntaxe
    const plainText = stripMarkdown(text);

    // write-good retourne un tableau de suggestions
    const suggestions = writeGood(plainText, {
        passive: true,
        illusion: true,
        so: true,
        thereIs: true,
        weasel: true,
        adverb: true,
        tooWordy: true,
        cliches: true,
    });

    // Calculer un score (100 = parfait, 0 = catastrophique)
    const wordCount = plainText.split(/\s+/).filter(Boolean).length || 1;
    const issueRate = suggestions.length / wordCount;
    const score = Math.max(0, Math.round(100 - issueRate * 500));

    return {
        suggestions: suggestions.map((s) => ({
            reason: s.reason,
            context: plainText.slice(s.index, s.index + s.offset + 20).trim(),
            position: s.index,
        })),
        score,
        wordCount,
    };
}

/**
 * Retire la syntaxe Markdown pour ne garder que le texte.
 */
function stripMarkdown(md) {
    return md
        // Code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        // Images et liens (garder le texte)
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Titres
        .replace(/^#{1,6}\s+/gm, '')
        // Gras / italique
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Citations
        .replace(/^>\s+/gm, '')
        // Listes
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        // Nettoyage final
        .trim();
}