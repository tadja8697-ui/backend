// ============================================================
// RÈGLES DE VALIDATION
// ============================================================

const RULES = {
    title: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200,
    },
    content: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 10000,
    },
    category: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
    },
    tags: {
        required: false,
        type: 'array',
        maxItems: 20,
        itemMaxLength: 30,
    },
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Valide les données d'un post.
 * @param {Object} data
 * @returns {string[]} Liste d'erreurs (vide si valide)
 */
export function validatePostData(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        return ['Request body must be a JSON object.'];
    }

    for (const [field, rules] of Object.entries(RULES)) {
        const value = data[field];

        // ---------- Required ----------
        if (rules.required && (value === undefined || value === null)) {
            errors.push(`"${field}" is required.`);
            continue;
        }

        // Champ optionnel non fourni → OK
        if (value === undefined || value === null) continue;

        // ---------- Type ----------
        if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`"${field}" must be a string.`);
            continue;
        }

        if (rules.type === 'array' && !Array.isArray(value)) {
            errors.push(`"${field}" must be an array.`);
            continue;
        }

        // ---------- String : longueur ----------
        if (rules.type === 'string') {
            const trimmed = value.trim();

            if (rules.minLength && trimmed.length < rules.minLength) {
                errors.push(`"${field}" must be at least ${rules.minLength} character(s).`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`"${field}" must be at most ${rules.maxLength} characters.`);
            }
        }

        // ---------- Array : longueur + items ----------
        if (rules.type === 'array') {
            if (rules.maxItems && value.length > rules.maxItems) {
                errors.push(`"${field}" can contain at most ${rules.maxItems} items.`);
            }
            value.forEach((item, i) => {
                if (typeof item !== 'string') {
                    errors.push(`"${field}[${i}]" must be a string.`);
                } else if (item.length > rules.itemMaxLength) {
                    errors.push(`"${field}[${i}]" must be at most ${rules.itemMaxLength} characters.`);
                }
            });
        }
    }

    return errors;
}

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Middleware Express : valide req.body pour POST/PUT.
 */
export function validatePost(req, res, next) {
    const errors = validatePostData(req.body);

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors,
        });
    }

    // Normaliser (trim + valeurs par défaut)
    req.body.title = req.body.title.trim();
    req.body.content = req.body.content.trim();
    req.body.category = req.body.category.trim();
    req.body.tags = (req.body.tags || []).map((t) => t.trim()).filter(Boolean);

    next();
}