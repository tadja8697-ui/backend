// ============================================================
// 1. DÉFINITION DES UNITÉS
// ============================================================

/**
 * Chaque unité a un facteur de conversion vers une unité de base.
 * - Length  : base = meter
 * - Weight  : base = kilogram
 * - Temperature : géré séparément (pas multiplicatif)
 */
export const FACTORS = {
    length: {
        mm: 0.001,
        cm: 0.01,
        m:  1,
        km: 1000,
        in: 0.0254,
        ft: 0.3048,
        yd: 0.9144,
        mi: 1609.344,
    },
    weight: {
        mg: 0.000001,
        g:  0.001,
        kg: 1,
        oz: 0.0283495,
        lb: 0.453592,
    },
};

/**
 * Labels affichés dans les <select>.
 */
export const UNITS = {
    length: [
        { value: 'mm', label: 'Millimeter (mm)' },
        { value: 'cm', label: 'Centimeter (cm)' },
        { value: 'm',  label: 'Meter (m)' },
        { value: 'km', label: 'Kilometer (km)' },
        { value: 'in', label: 'Inch (in)' },
        { value: 'ft', label: 'Foot (ft)' },
        { value: 'yd', label: 'Yard (yd)' },
        { value: 'mi', label: 'Mile (mi)' },
    ],
    weight: [
        { value: 'mg', label: 'Milligram (mg)' },
        { value: 'g',  label: 'Gram (g)' },
        { value: 'kg', label: 'Kilogram (kg)' },
        { value: 'oz', label: 'Ounce (oz)' },
        { value: 'lb', label: 'Pound (lb)' },
    ],
    temperature: [
        { value: 'c', label: 'Celsius (°C)' },
        { value: 'f', label: 'Fahrenheit (°F)' },
        { value: 'k', label: 'Kelvin (K)' },
    ],
};

/**
 * Les types de conversion disponibles.
 */
export const TYPES = ['length', 'weight', 'temperature'];

/**
 * Titres affichés dans le formulaire selon le type.
 */
export const TYPE_LABELS = {
    length: 'length',
    weight: 'weight',
    temperature: 'temperature',
};

// ============================================================
// 2. CONVERSIONS
// ============================================================

/**
 * Convertit une valeur entre 2 unités de même type.
 * @param {string} type  - 'length' | 'weight' | 'temperature'
 * @param {string} rawValue - La valeur saisie (string)
 * @param {string} from  - Unité source
 * @param {string} to    - Unité cible
 * @returns {Object} { value, error }
 */
export function convert(type, rawValue, from, to) {
    // ---------- Validation ----------
    if (!TYPES.includes(type)) {
        return { error: 'Invalid conversion type.' };
    }

    const num = parseFloat(rawValue);

    if (Number.isNaN(num)) {
        return { error: 'Please enter a valid number.' };
    }

    // ---------- Température (formules spéciales) ----------
    if (type === 'temperature') {
        return convertTemperature(num, from, to);
    }

    // ---------- Length / Weight (facteurs multiplicatifs) ----------
    const factors = FACTORS[type];

    if (!factors || !factors[from] || !factors[to]) {
        return { error: 'Invalid unit.' };
    }

    // 1. Convertir vers l'unité de base
    const baseValue = num * factors[from];

    // 2. Convertir de la base vers la cible
    const result = baseValue / factors[to];

    return { value: result };
}

/**
 * Conversion de température (formules avec offset).
 */
function convertTemperature(value, from, to) {
    const validUnits = ['c', 'f', 'k'];

    if (!validUnits.includes(from) || !validUnits.includes(to)) {
        return { error: 'Invalid temperature unit.' };
    }

    // Si même unité → renvoyer la valeur telle quelle
    if (from === to) return { value };

    // 1. Convertir en Celsius
    let celsius;
    switch (from) {
        case 'c': celsius = value; break;
        case 'f': celsius = (value - 32) * 5 / 9; break;
        case 'k': celsius = value - 273.15; break;
    }

    // 2. Convertir de Celsius vers la cible
    let result;
    switch (to) {
        case 'c': result = celsius; break;
        case 'f': result = celsius * 9 / 5 + 32; break;
        case 'k': result = celsius + 273.15; break;
    }

    return { value: result };
}

// ============================================================
// 3. FORMATAGE
// ============================================================

/**
 * Formate un nombre pour l'affichage.
 * - Max 2 décimales
 * - Sans zéros inutiles
 * - Sans notation scientifique
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
    if (!Number.isFinite(num)) return '0';

    // Arrondir à 2 décimales puis enlever les zéros
    const rounded = Math.round(num * 100) / 100;

    // Pour les très petits nombres, utiliser toFixed
    if (Math.abs(rounded) < 0.01 && rounded !== 0) {
        return rounded.toExponential(2);
    }

    return rounded.toString();
}