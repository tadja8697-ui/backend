// Catégories autorisées (enum)
export const CATEGORIES = [
    'groceries',
    'leisure',
    'electronics',
    'utilities',
    'clothing',
    'health',
    'others',
];

// Labels pour l'affichage
export const CATEGORY_LABELS = {
    groceries:   'Groceries',
    leisure:     'Leisure',
    electronics: 'Electronics',
    utilities:   'Utilities',
    clothing:    'Clothing',
    health:      'Health',
    others:      'Others',
};

/**
 * Vérifie qu'une catégorie est valide.
 */
export function isValidCategory(category) {
    return CATEGORIES.includes(category);
}