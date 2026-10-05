import { httpError } from './errorHandler.js';
import { isValidCategory } from '../utils/categories.js';
import { isValidDate } from '../utils/dates.js';

// ============================================================
// RÈGLES
// ============================================================

const RULES = {
    // --- USER ---
    name:     { required: true, type: 'string', minLength: 2, maxLength: 100 },
    email:    { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, maxLength: 200 },
    password: { required: true, type: 'string', minLength: 8, maxLength: 100 },

    // --- EXPENSE ---
    amount: {
        required: true,
        type: 'number',
        min: 0.01,
        max: 1_000_000,
    },
    category: {
        required: true,
        type: 'string',
        custom: (v) => isValidCategory(v) || `"category" must be one of: groceries, leisure, electronics, utilities, clothing, health, others.`,
    },
    description: {
        required: false,
        type: 'string',
        maxLength: 500,
    },
    date: {
        required: true,
        type: 'string',
        custom: (v) => isValidDate(v) || `"date" must be in YYYY-MM-DD format.`,
    },
};

// ============================================================
// VALIDATION
// ============================================================

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

        if (value === undefined || value === null) continue;

        // Type
        if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`"${field}" must be a string.`);
            continue;
        }

        if (rules.type === 'number' && typeof value !== 'number') {
            errors.push(`"${field}" must be a number.`);
            continue;
        }

        // String : longueur + pattern
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

        // Number : bornes
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`"${field}" must be >= ${rules.min}.`);
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`"${field}" must be <= ${rules.max}.`);
            }
        }

        // Custom
        if (rules.custom) {
            const result = rules.custom(value);
            if (result !== true) errors.push(result);
        }
    }

    return errors;
}

export function validate(fields) {
    return (req, res, next) => {
        const errors = validateFields(req.body, fields);
        if (errors.length > 0) {
            return next(httpError(400, 'Validation failed', errors));
        }

        // Normaliser
        fields.forEach((f) => {
            if (typeof req.body[f] === 'string') req.body[f] = req.body[f].trim();
        });

        next();
    };
}