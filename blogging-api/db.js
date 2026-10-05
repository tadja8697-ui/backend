import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ============================================================
// 1. CRÉATION DU DOSSIER DATA
// ============================================================

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// 2. CONNEXION À LA BASE
// ============================================================

const DB_PATH = path.join(DATA_DIR, 'blog.db');
const db = new Database(DB_PATH);

// Mode WAL : meilleures performances en lecture/écriture
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// 3. SCHÉMA
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
`);

console.log('✅ Database initialized');

export default db;