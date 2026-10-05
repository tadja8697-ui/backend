// ============================================================
// 1. LAYOUT
// ============================================================

export function layout({ title, content, isAdmin = false }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Personal Blog</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="page">
        <header class="site-header">
            <a href="/" class="site-title">Personal Blog</a>
            <nav class="site-nav">
                ${isAdmin
                    ? `<a href="/admin">Admin</a>
                       <form method="POST" action="/logout" class="inline-form">
                           <button type="submit" class="link-btn">Logout</button>
                       </form>`
                    : `<a href="/login">Login</a>`
                }
            </nav>
        </header>
        <main class="content">
            ${content}
        </main>
    </div>
</body>
</html>`;
}

// ============================================================
// 2. GUEST — LISTE
// ============================================================

export function renderHome(articles, isAdmin) {
    const items = articles.length === 0
        ? '<p class="empty">No articles yet.</p>'
        : `<ul class="article-list">
            ${articles.map((a) => `
                <li class="article-item">
                    <a href="/article/${a.id}" class="article-link">
                        <span class="article-title">${escapeHtml(a.title)}</span>
                        <span class="article-date">${formatDate(a.date)}</span>
                    </a>
                </li>
            `).join('')}
        </ul>`;

    return layout({
        title: 'Home',
        isAdmin,
        content: `
            <h1 class="page-title">Personal Blog</h1>
            ${items}
        `,
    });
}

// ============================================================
// 3. GUEST — ARTICLE
// ============================================================

export function renderArticle(article, isAdmin) {
    return layout({
        title: article.title,
        isAdmin,
        content: `
            <article class="article-detail">
                <h1 class="article-detail-title">${escapeHtml(article.title)}</h1>
                <p class="article-detail-date">${formatDate(article.date)}</p>
                <div class="article-detail-content">
                    ${escapeHtml(article.content).replace(/\n/g, '<br>')}
                </div>
            </article>
            <a href="/" class="btn btn-secondary">← Back to home</a>
        `,
    });
}

// ============================================================
// 4. ADMIN — DASHBOARD
// ============================================================

export function renderAdmin(articles) {
    const items = articles.length === 0
        ? '<p class="empty">No articles yet.</p>'
        : `<ul class="article-list">
            ${articles.map((a) => `
                <li class="article-item admin-item">
                    <div class="admin-item-info">
                        <span class="article-title">${escapeHtml(a.title)}</span>
                        <span class="article-date">${formatDate(a.date)}</span>
                    </div>
                    <div class="admin-item-actions">
                        <a href="/edit/${a.id}" class="action-link">Edit</a>
                        <form method="POST" action="/delete/${a.id}" class="inline-form"
                              onsubmit="return confirm('Delete this article?');">
                            <button type="submit" class="action-link action-link-danger">Delete</button>
                        </form>
                    </div>
                </li>
            `).join('')}
        </ul>`;

    return layout({
        title: 'Admin Dashboard',
        isAdmin: true,
        content: `
            <div class="admin-header">
                <h1 class="page-title">Admin Dashboard</h1>
                <a href="/new" class="btn btn-primary">+ Add</a>
            </div>
            ${items}
        `,
    });
}

// ============================================================
// 5. ADMIN — FORMULAIRES
// ============================================================

export function renderNewForm() {
    return layout({
        title: 'New Article',
        isAdmin: true,
        content: `
            <h1 class="page-title">New Article</h1>
            <form method="POST" action="/new" class="form">
                ${formFields({ title: '', date: todayISO(), content: '' })}
                <button type="submit" class="btn btn-primary">Publish</button>
            </form>
        `,
    });
}

export function renderEditForm(article) {
    return layout({
        title: `Edit: ${article.title}`,
        isAdmin: true,
        content: `
            <h1 class="page-title">Update Article</h1>
            <form method="POST" action="/edit/${article.id}" class="form">
                ${formFields(article)}
                <button type="submit" class="btn btn-primary">Update</button>
            </form>
        `,
    });
}

function formFields({ title, date, content }) {
    return `
        <label for="title" class="field-label">Article Title</label>
        <input
            type="text"
            id="title"
            name="title"
            class="field-input"
            value="${escapeHtml(title)}"
            required
        >

        <label for="date" class="field-label">Publishing Date</label>
        <input
            type="date"
            id="date"
            name="date"
            class="field-input"
            value="${escapeHtml(date)}"
            required
        >

        <label for="content" class="field-label">Content</label>
        <textarea
            id="content"
            name="content"
            class="field-textarea"
            rows="10"
            required
        >${escapeHtml(content)}</textarea>
    `;
}

// ============================================================
// 6. AUTH — LOGIN
// ============================================================

export function renderLogin({ error } = {}) {
    return layout({
        title: 'Login',
        content: `
            <h1 class="page-title">Admin Login</h1>

            ${error ? `<p class="error" role="alert">⚠️ ${escapeHtml(error)}</p>` : ''}

            <form method="POST" action="/login" class="form">
                <label for="password" class="field-label">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    class="field-input"
                    required
                    autofocus
                >
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
        `,
    });
}

// ============================================================
// 7. UTILITAIRES
// ============================================================

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}