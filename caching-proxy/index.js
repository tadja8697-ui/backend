#!/usr/bin/env node

import { parseArgs } from './lib/args.js';
import { startProxy } from './lib/proxy.js';
import { clearCache, getCacheStats } from './lib/cache.js';

// Couleurs ANSI
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

// ============================================================
// HELP
// ============================================================

function printHelp() {
    console.log(`
${c.bold}Caching Proxy${c.reset} — a simple HTTP caching proxy server

${c.cyan}Usage:${c.reset}
  caching-proxy --port <number> --origin <url>
  caching-proxy --clear-cache
  caching-proxy --stats

${c.cyan}Options:${c.reset}
  --port <number>     Port to listen on (1-65535)
  --origin <url>      Origin server (must start with http:// or https://)
  --ttl <ms>          Cache TTL in ms (default: 300000 = 5 min)
  --clear-cache       Delete all cached responses
  --stats             Show cache statistics
  -h, --help          Show this help
  -v, --version       Show version

${c.cyan}Examples:${c.reset}
  ${c.dim}# Start proxy on port 3000, forward to dummyjson.com${c.reset}
  caching-proxy --port 3000 --origin http://dummyjson.com

  ${c.dim}# Then in another terminal:${c.reset}
  curl http://localhost:3000/products

  ${c.dim}# Clear the cache${c.reset}
  caching-proxy --clear-cache
`);
}

// ============================================================
// UTILITAIRES
// ============================================================

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validatePort(value) {
    const port = parseInt(value, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`--port must be a number between 1 and 65535 (got "${value}").`);
    }
    return port;
}

function validateOrigin(value) {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
        throw new Error(`--origin must start with http:// or https:// (got "${value}").`);
    }
    try {
        new URL(value);
    } catch {
        throw new Error(`--origin must be a valid URL (got "${value}").`);
    }
    return value;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    const args = parseArgs(process.argv.slice(2));

    // ---------- Help / Version ----------
    if (args.help) {
        printHelp();
        return;
    }

    if (args.version) {
        console.log('caching-proxy v1.0.0');
        return;
    }

    // ---------- --clear-cache ----------
    if (args['clear-cache']) {
        const { count, path } = await clearCache();

        if (count === 0) {
            console.log(`${c.yellow}ℹ️  Cache was already empty.${c.reset}`);
        } else {
            console.log(`${c.green}✅ Cache cleared: ${count} entries removed.${c.reset}`);
        }
        console.log(`${c.dim}   Location: ${path}${c.reset}`);
        return;
    }

    // ---------- --stats ----------
    if (args.stats) {
        const { count, sizeBytes } = await getCacheStats();
        console.log(`\n${c.bold}📊 Cache statistics${c.reset}`);
        console.log(`   Entries: ${c.cyan}${count}${c.reset}`);
        console.log(`   Size:    ${c.cyan}${formatBytes(sizeBytes)}${c.reset}\n`);
        return;
    }

    // ---------- Validation ----------
    if (!args.port || !args.origin) {
        console.error(`${c.red}❌ Missing required options.${c.reset}`);
        console.error(`${c.dim}   Run with --help to see usage.${c.reset}\n`);
        process.exit(1);
    }

    let port, origin, ttl;
    try {
        port = validatePort(args.port);
        origin = validateOrigin(args.origin);
        ttl = args.ttl ? parseInt(args.ttl, 10) : undefined;

        if (ttl !== undefined && (Number.isNaN(ttl) || ttl < 0)) {
            throw new Error(`--ttl must be a positive number.`);
        }
    } catch (err) {
        console.error(`${c.red}❌ ${err.message}${c.reset}\n`);
        process.exit(1);
    }

    // ---------- Démarrage ----------
    try {
        await startProxy({ port, origin, ttl });

        console.log(`
${c.bold}${c.magenta}🚀 Caching Proxy running${c.reset}

   ${c.cyan}Listening:${c.reset}  http://localhost:${port}
   ${c.cyan}Origin:${c.reset}     ${origin}
   ${c.cyan}TTL:${c.reset}        ${ttl ? `${ttl} ms` : '5 min (default)'}
   ${c.cyan}Cache dir:${c.reset}  ./.caching-proxy-cache

${c.dim}   Try: curl http://localhost:${port}/products
   Press Ctrl+C to stop.${c.reset}
`);
    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            console.error(`${c.red}❌ Port ${port} is already in use.${c.reset}`);
        } else {
            console.error(`${c.red}❌ Failed to start: ${err.message}${c.reset}`);
        }
        process.exit(1);
    }
}

main();