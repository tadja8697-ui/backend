import db from '../db.js';

const posts = [
    {
        title: 'Getting Started with Node.js',
        content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine. It allows you to run JavaScript on the server side, opening up a whole new world of possibilities for web development.',
        category: 'Technology',
        tags: ['Node.js', 'JavaScript', 'Backend'],
    },
    {
        title: 'Understanding REST APIs',
        content: 'REST is an architectural style for designing networked applications. It relies on a stateless, client-server, cacheable communications protocol — in virtually all cases, HTTP.',
        category: 'Technology',
        tags: ['REST', 'API', 'HTTP'],
    },
    {
        title: 'My Favorite Coffee Shops in Paris',
        content: 'Paris is not just about the Eiffel Tower. The coffee scene has exploded in recent years, with specialty roasters and cozy cafés popping up all over the city.',
        category: 'Travel',
        tags: ['Paris', 'Coffee', 'Travel'],
    },
    {
        title: 'The Art of Writing Clean Code',
        content: 'Clean code is not about being clever. It is about being clear. Code is read far more often than it is written, so optimize for readability first.',
        category: 'Programming',
        tags: ['Programming', 'Best Practices'],
    },
    {
        title: 'Introduction to SQL Databases',
        content: 'SQL databases have been the backbone of applications for decades. They provide ACID guarantees, strong consistency, and a mature ecosystem of tools.',
        category: 'Technology',
        tags: ['SQL', 'Database', 'Backend'],
    },
];

const insert = db.prepare(`
    INSERT INTO posts (title, content, category, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();

// Vider la table pour re-seed propre
db.prepare('DELETE FROM posts').run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='posts'").run();

for (const post of posts) {
    insert.run(
        post.title,
        post.content,
        post.category,
        JSON.stringify(post.tags),
        now,
        now
    );
}

console.log(`✅ Seeded ${posts.length} posts successfully`);