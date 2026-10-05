/**
 * Parse les arguments nommés.
 * Supporte :
 *   --port 3000
 *   --origin http://example.com
 *   --port=3000
 *   --clear-cache
 *   -h, -v
 */
export function parseArgs(argv) {
    const result = {};

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        // --key=value
        if (arg.startsWith('--') && arg.includes('=')) {
            const [key, ...rest] = arg.slice(2).split('=');
            result[key] = rest.join('=');
            continue;
        }

        // --key value
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = argv[i + 1];

            if (next !== undefined && !next.startsWith('--')) {
                result[key] = next;
                i++;
            } else {
                result[key] = true;
            }
            continue;
        }

        // Raccourcis
        if (arg === '-h') result.help = true;
        if (arg === '-v') result.version = true;
    }

    return result;
}