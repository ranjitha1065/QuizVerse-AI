import { icon } from '../utils/icons.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function renderAdmin(state, stats, users, categories, quizzes) {
  const adminTab = state.adminTab || 'stats';

  // Sidebar admin tabs
  const tabsHtml = `
    <nav class="side-nav" aria-label="Admin settings" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--line);padding-bottom:10px;overflow-x:auto;">
      <button class="${adminTab === 'stats' ? 'active' : ''}" data-admin-tab="stats" style="padding:8px 12px;font-size:12px;">${icon('bar-chart-2', 12)} Analytics</button>
      <button class="${adminTab === 'quizzes' ? 'active' : ''}" data-admin-tab="quizzes" style="padding:8px 12px;font-size:12px;">${icon('book-open', 12)} Manage Quizzes</button>
      <button class="${adminTab === 'categories' ? 'active' : ''}" data-admin-tab="categories" style="padding:8px 12px;font-size:12px;">${icon('palette', 12)} Categories</button>
      <button class="${adminTab === 'users' ? 'active' : ''}" data-admin-tab="users" style="padding:8px 12px;font-size:12px;">${icon('users', 12)} Manage Users</button>
    </nav>
  `;

  let contentHtml = '';

  if (adminTab === 'stats') {
    contentHtml = `
      <div class="stats-grid" style="margin-bottom:28px;">
        <article class="stat-card peach">
          <div class="stat-top"><span>Total Registered Users</span>${icon('users', 18)}</div>
          <strong class="stat-value">${stats.totalUsers}</strong>
          <span class="stat-meta">Active profiles</span>
        </article>
        <article class="stat-card butter">
          <div class="stat-top"><span>Published Quizzes</span>${icon('book-open', 18)}</div>
          <strong class="stat-value">${stats.totalQuizzes}</strong>
          <span class="stat-meta">Total database entities</span>
        </article>
        <article class="stat-card mint">
          <div class="stat-top"><span>Global Quiz Plays</span>${icon('play', 18)}</div>
          <strong class="stat-value">${stats.totalPlays.toLocaleString()}</strong>
          <span class="stat-meta">Cumulative completions</span>
        </article>
      </div>

      <!-- EXPORT DATA & BACK TO SPACE -->
      <article class="panel">
        <h2 style="font-size:16px;margin:0 0 10px 0;">Data Export Center</h2>
        <p style="color:var(--muted);font-size:11.5px;margin:0 0 20px 0;">Export active system data directly into downloadable CSV format for analysis.</p>
        <div style="display:flex;gap:12px;">
          <button class="dark-btn" id="export-users-csv" style="font-size:12px;min-height:36px;">
            ${icon('download', 14)} Export Users (CSV)
          </button>
          <button class="dark-btn" id="export-quizzes-csv" style="font-size:12px;min-height:36px;">
            ${icon('download', 14)} Export Quizzes (CSV)
          </button>
        </div>
      </article>
    `;

  } else if (adminTab === 'quizzes') {
    contentHtml = `
      <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:start;">
        <!-- Left: Published Quizzes list -->
        <article class="panel" style="padding:22px;">
          <div class="panel-heading" style="margin-bottom:20px;">
            <h2>Quizzes List</h2>
            <span>${quizzes.length} quizzes</span>
          </div>
          <div style="display:grid;gap:10px;max-height:480px;overflow-y:auto;padding-right:5px;">
            ${quizzes.map(q => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--paper);border:1px solid var(--line);border-radius:8px;font-size:12px;">
                <div>
                  <strong>${escapeHtml(q.title)}</strong>
                  <span style="display:block;font-size:10px;color:var(--muted);">${escapeHtml(q.category)} • ${q.difficulty} • ${q.plays} plays</span>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="ghost-btn" data-action="delete-quiz" data-id="${q.id}" style="min-height:28px;padding:0 8px;font-size:10px;color:#a34f47;border-color:rgba(163,79,71,0.2);">
                    Delete
                  </button>
                </div>
              </div>`).join('')}
          </div>
        </article>

        <!-- Right: Create Quiz Tool -->
        <article class="panel" style="padding:22px;">
          <h2 style="font-size:16px;margin:0 0 14px 0;">Create New Quiz</h2>
          <form id="admin-create-quiz-form" class="generator" style="display:grid;gap:12px;">
            <label>
              Title
              <input type="text" id="new-quiz-title" placeholder="Quiz Title..." required>
            </label>
            <label>
              Description
              <textarea id="new-quiz-desc" placeholder="A brief summary..." rows="2" required style="width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 12px;color:var(--ink);background:var(--panel);outline:none;font:inherit;"></textarea>
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <label>
                Category
                <select id="new-quiz-cat" required>
                  ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                </select>
              </label>
              <label>
                Difficulty
                <select id="new-quiz-diff" required>
                  <option value="easy">Easy</option>
                  <option value="medium" selected>Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <label>
                Duration (minutes)
                <input type="number" id="new-quiz-time" value="5" min="1" required>
              </label>
              <label>
                Color class
                <select id="new-quiz-color">
                  <option value="peach">Peach</option>
                  <option value="mint" selected>Mint</option>
                  <option value="lavender">Lavender</option>
                  <option value="butter">Butter</option>
                  <option value="sky">Sky</option>
                  <option value="rose">Rose</option>
                </select>
              </label>
            </div>

            <!-- Quiz Questions Builder (Simple 2 Questions placeholder) -->
            <div style="border-top:1px solid var(--line);margin-top:10px;padding-top:14px;">
              <h3 style="font-size:13px;margin:0 0 10px 0;">Add Questions</h3>
              
              <div style="display:grid;gap:8px;background:var(--paper);padding:10px;border-radius:8px;margin-bottom:8px;">
                <strong style="font-size:11px;">Question #1</strong>
                <input type="text" id="q1-prompt" placeholder="Prompt question..." required style="padding:6px 8px;font-size:11.5px;">
                <input type="text" id="q1-opt0" placeholder="Option A (Correct)" required style="padding:6px 8px;font-size:11px;">
                <input type="text" id="q1-opt1" placeholder="Option B" required style="padding:6px 8px;font-size:11px;">
                <input type="text" id="q1-opt2" placeholder="Option C" required style="padding:6px 8px;font-size:11px;">
                <input type="text" id="q1-opt3" placeholder="Option D" required style="padding:6px 8px;font-size:11px;">
                <input type="text" id="q1-hint" placeholder="Hint..." style="padding:6px 8px;font-size:11px;">
                <input type="text" id="q1-exp" placeholder="Explanation..." style="padding:6px 8px;font-size:11px;">
              </div>
            </div>

            <button class="dark-btn" type="submit" style="background:var(--yellow);color:#252525;border-color:var(--yellow);font-size:12px;margin-top:10px;">
              Publish Quiz
            </button>
          </form>
        </article>
      </div>
    `;

  } else if (adminTab === 'categories') {
    contentHtml = `
      <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:start;">
        <!-- Left: Categories list -->
        <article class="panel">
          <div class="panel-heading" style="margin-bottom:20px;">
            <h2>Categories</h2>
            <span>${categories.length} active</span>
          </div>
          <div style="display:grid;gap:10px;">
            ${categories.map(c => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--paper);border:1px solid var(--line);border-radius:8px;font-size:12px;">
                <div style="display:flex;gap:8px;align-items:center;">
                  <div class="avatar" style="width:24px;height:24px;border-radius:6px;background:var(--panel);">${icon(c.icon || 'tag', 12)}</div>
                  <strong>${escapeHtml(c.name)}</strong>
                </div>
                <button class="ghost-btn" data-action="delete-category" data-id="${c.id}" style="min-height:26px;padding:0 8px;font-size:10px;color:#a34f47;border-color:rgba(163,79,71,0.2);">
                  Delete
                </button>
              </div>`).join('')}
          </div>
        </article>

        <!-- Right: Create Category Form -->
        <article class="panel">
          <h2 style="font-size:16px;margin:0 0 14px 0;">Create Category</h2>
          <form id="admin-create-category-form" class="generator" style="display:grid;gap:12px;">
            <label>
              Category Name
              <input type="text" id="cat-name" placeholder="Name..." required>
            </label>
            <label>
              Description
              <input type="text" id="cat-desc" placeholder="Brief summary...">
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <label>
                Color style
                <select id="cat-color">
                  <option value="peach">Peach</option>
                  <option value="mint">Mint</option>
                  <option value="lavender">Lavender</option>
                  <option value="butter">Butter</option>
                  <option value="sky">Sky</option>
                  <option value="rose">Rose</option>
                </select>
              </label>
              <label>
                Icon name (Lucide)
                <input type="text" id="cat-icon" value="tag" placeholder="E.g., cpu, atom, trophy">
              </label>
            </div>
            
            <button class="dark-btn" type="submit" style="background:var(--yellow);color:#252525;border-color:var(--yellow);font-size:12px;margin-top:10px;width:fit-content;">
              Create Category
            </button>
          </form>
        </article>
      </div>
    `;

  } else if (adminTab === 'users') {
    contentHtml = `
      <article class="panel">
        <div class="panel-heading" style="margin-bottom:20px;">
          <h2>System Users</h2>
          <span>${users.length} registered</span>
        </div>
        
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
            <thead>
              <tr style="border-bottom:1px solid var(--line);color:var(--muted);font-family:'DM Mono',monospace;font-size:10px;">
                <th style="padding:10px 8px;">User</th>
                <th style="padding:10px 8px;">Country</th>
                <th style="padding:10px 8px;">XP</th>
                <th style="padding:10px 8px;">Role</th>
                <th style="padding:10px 8px;">Status</th>
                <th style="padding:10px 8px;text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const name = u.display_name || u.username || 'Learner';
                return `
                  <tr style="border-bottom:1px solid var(--line);">
                    <td style="padding:10px 8px;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="avatar" style="width:22px;height:22px;font-size:9px;">${name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <strong>${escapeHtml(name)}</strong>
                          <span style="font-size:9px;color:var(--muted);display:block;">@${escapeHtml(u.username)}</span>
                        </div>
                      </div>
                    </td>
                    <td style="padding:10px 8px;color:var(--muted);">${escapeHtml(u.country || '-')}</td>
                    <td style="padding:10px 8px;font-weight:bold;">${(u.xp || 0).toLocaleString()}</td>
                    <td style="padding:10px 8px;">${u.is_admin ? `<span class="tag" style="background:var(--yellow);font-size:8px;">ADMIN</span>` : `<span style="color:var(--muted);">User</span>`}</td>
                    <td style="padding:10px 8px;">${u.is_banned ? `<span class="tag" style="background:#efb7b2;color:#a34f47;font-size:8px;">BANNED</span>` : `<span style="color:#b8d9c2;">Active</span>`}</td>
                    <td style="padding:10px 8px;text-align:right;display:flex;gap:4px;justify-content:flex-end;min-height:44px;align-items:center;">
                      <button class="ghost-btn" data-action="toggle-user-role" data-id="${u.id}" data-admin="${u.is_admin}" style="min-height:24px;font-size:9px;padding:0 6px;">
                        ${u.is_admin ? 'Make User' : 'Make Admin'}
                      </button>
                      <button class="ghost-btn" data-action="toggle-user-ban" data-id="${u.id}" data-banned="${u.is_banned}" style="min-height:24px;font-size:9px;padding:0 6px;color:#a34f47;border-color:rgba(163,79,71,0.15);">
                        ${u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  return `
    <main class="container view" style="padding-top:40px;padding-bottom:80px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div>
          <span class="eyebrow" style="color:var(--yellow);">ADMIN PANEL</span>
          <h1 style="font-size:32px;letter-spacing:-.06em;margin:8px 0;">Control Dashboard</h1>
        </div>
        <button class="ghost-btn" data-view="dashboard" style="font-size:12px;">
          Back to Space
        </button>
      </div>

      ${tabsHtml}

      ${contentHtml}
    </main>
  `;
}
