import { httpError } from './errorHandler.js';

// ============================================================
// RÈGLES DE VALIDATION
// ============================================================

const RULES = {
    // --- USER ---
    name: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100,
    },
    email: {
        required: true,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxLength: 200,
    },
    password: {
        required: true,
        type: 'string',
        minLength: 8,
        maxLength: 100,
    },
    // --- TODO ---
    title: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200,
    },
    description: {
        required: false,
        type: 'string',
        maxLength: 2000,
    },
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Valide un objet selon une liste de champs.
 * @param {Object} data
 * @param {string[]} fields
 * @returns {string[]} Liste d'erreurs
 */
export function validateFields(data, fields) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        return ['Request body must be a JSON object.'];
    }

    for (const field of fields) {
        const rules = RULES[field];
        if (!rules) continue;

        const value = data[field];

        // Required
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`"${field}" is required.`);
            continue;
        }

        // Optionnel non fourni → OK
        if (value === undefined || value === null) continue;

        // Type
        if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`"${field}" must be a string.`);
            continue;
        }

        // Longueur
        if (rules.type === 'string') {
            const trimmed = value.trim();

            if (rules.minLength && trimmed.length < rules.minLength) {
                errors.push(`"${field}" must be at least ${rules.minLength} character(s).`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`"${field}" must be at most ${rules.maxLength} characters.`);
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`"${field}" format is invalid.`);
            }
        }
    }

    return errors;
}

/**
 * Middleware factory : valide les champs demandés.
 */
export function validate(fields) {
    return (req, res, next) => {
        const errors = validateFields(req.body, fields);

        if (errors.length > 0) {
            return next(httpError(400, 'Validation failed', errors));
        }

        // Normaliser
        fields.forEach((f) => {
            if (typeof req.body[f] === 'string') {
                req.body[f] = req.body[f].trim();
            }
        });

        next();
    };
}