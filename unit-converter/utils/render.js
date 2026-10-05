import { UNITS, TYPE_LABELS } from './convert.js';

// ============================================================
// 1. LAYOUT PRINCIPAL
// ============================================================

/**
 * Rend la page complète.
 * @param {Object} options
 * @param {string} options.type    - 'length' | 'weight' | 'temperature'
 * @param {Object|null} options.result - Résultat de conversion ou null
 * @param {Object} options.formData - Valeurs du formulaire (value, from, to)
 * @returns {string} HTML complet
 */
export function renderPage({ type, result, formData = {} }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unit Converter</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <main class="page">
        <h1 class="title">Unit Converter</h1>

        ${renderTabs(type)}

        <div class="content">
            ${result
                ? renderResult({ type, result, formData })
                : renderForm({ type, formData })
            }
        </div>
    </main>
</body>
</html>`;
}

// ============================================================
// 2. TABS
// ============================================================

function renderTabs(activeType) {
    const tabs = [
        { type: 'length',      label: 'Length' },
        { type: 'weight',      label: 'Weight' },
        { type: 'temperature', label: 'Temperature' },
    ];

    return `
        <nav class="tabs" aria-label="Conversion type">
            ${tabs.map((tab) => `
                <a
                    href="/${tab.type}"
                    class="tab ${tab.type === activeType ? 'is-active' : ''}"
                    ${tab.type === activeType ? 'aria-current="page"' : ''}
                >
                    ${tab.label}
                </a>
            `).join('')}
        </nav>
    `;
}

// ============================================================
// 3. FORMULAIRE
// ============================================================

function renderForm({ type, formData }) {
    const units = UNITS[type];
    const typeLabel = TYPE_LABELS[type];
    const { value = '', from = '', to = '' } = formData;

    return `
        <form method="POST" action="/convert" class="form" novalidate>
            <input type="hidden" name="type" value="${type}">

            <label for="value" class="field-label">
                Enter the ${typeLabel} to convert
            </label>
            <input
                type="text"
                id="value"
                name="value"
                class="field-input"
                placeholder="0.00"
                value="${escapeHtml(value)}"
                autocomplete="off"
                required
            >

            <label for="from" class="field-label">Unit to Convert from</label>
            <select id="from" name="from" class="field-select" required>
                ${units.map((u) => `
                    <option value="${u.value}" ${u.value === from ? 'selected' : ''}>
                        ${u.label}
                    </option>
                `).join('')}
            </select>

            <label for="to" class="field-label">Unit to Convert to</label>
            <select id="to" name="to" class="field-select" required>
                ${units.map((u) => `
                    <option value="${u.value}" ${u.value === to ? 'selected' : ''}>
                        ${u.label}
                    </option>
                `).join('')}
            </select>

            <button type="submit" class="btn">Convert</button>
        </form>
    `;
}

// ============================================================
// 4. RÉSULTAT
// ============================================================

function renderResult({ type, result, formData }) {
    // Erreur
    if (result.error) {
        return `
            <div class="result">
                <p class="result-label">Result of your calculation</p>

                <p class="result-error" role="alert">⚠️ ${result.error}</p>

                <a href="/${type}" class="btn">Reset</a>
            </div>
        `;
    }

    // Succès
    const unitFrom = findUnitLabel(type, formData.from);
    const unitTo   = findUnitLabel(type, formData.to);

    return `
        <div class="result">
            <p class="result-label">Result of your calculation</p>

            <p class="result-value" aria-live="polite">
                ${escapeHtml(formData.value)} ${unitFrom}
                = ${formatDisplayNumber(result.value)} ${unitTo}
            </p>

            <a href="/${type}" class="btn">Reset</a>
        </div>
    `;
}

// ============================================================
// 5. UTILITAIRES
// ============================================================

function findUnitLabel(type, value) {
    const unit = UNITS[type]?.find((u) => u.value === value);
    if (!unit) return value;

    // Extraire le symbole entre parenthèses : "Foot (ft)" → "ft"
    const match = unit.label.match(/\(([^)]+)\)/);
    return match ? match[1] : unit.label;
}

/**
 * Formate un nombre pour l'affichage (arrondi à 2 décimales).
 */
function formatDisplayNumber(num) {
    if (!Number.isFinite(num)) return '0';

    const rounded = Math.round(num * 100) / 100;
    return rounded.toString();
}

/**
 * Échappe les caractères HTML pour éviter les injections.
 */
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}