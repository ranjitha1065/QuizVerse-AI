import { icon } from '../utils/icons.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function renderDashboard(state, profile, bookmarks, achievements, earnedAchievements, certificates, friends, chatMessages, categories = []) {
  const activeTab = state.dashboardTab || 'overview';
  const username = profile?.display_name || profile?.fullname || profile?.username || state?.user?.fullName || state?.user?.username || 'Learner';
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const coins = profile?.coins || 0;
  const streak = profile?.streaks?.current_streak || 0;
  const accuracy = profile?.accuracy || 0;
  const completed = profile?.completed_quizzes || 0;

  // Sidebar HTML
  const sidebarHtml = `
    <aside class="sidebar">
      <div>
        <div class="profile-mini">
          <div class="avatar" style="background:#cbd7d1;">${username.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>${escapeHtml(username)}</strong>
            <small>Level ${level} explorer</small>
          </div>
        </div>
        <nav class="side-nav" aria-label="Your space">
          <button class="${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">${icon('layout-dashboard', 16)} Overview</button>
          <button class="${activeTab === 'bookmarks' ? 'active' : ''}" data-tab="bookmarks">${icon('bookmark', 16)} Bookmarks</button>
          <button class="${activeTab === 'achievements' ? 'active' : ''}" data-tab="achievements">${icon('trophy', 16)} Achievements</button>
          <button class="${activeTab === 'certificates' ? 'active' : ''}" data-tab="certificates">${icon('award', 16)} Certificates</button>
          <button class="${activeTab === 'social' ? 'active' : ''}" data-tab="social">${icon('users', 16)} Social & Chat</button>
          <button class="${activeTab === 'ai-hub' ? 'active' : ''}" data-tab="ai-hub">${icon('sparkles', 16)} AI Study Hub</button>
          ${profile?.is_admin ? `<button class="${activeTab === 'admin' ? 'active' : ''}" data-tab="admin" style="color:var(--yellow);font-weight:600;">${icon('shield', 16)} Admin Panel</button>` : ''}
        </nav>
      </div>
      <div class="side-bottom">
        <strong>Daily reward</strong>
        Keep your streak alive to unlock a mystery badge.<br><br>
        ${icon('gift', 16)} ${streak} day streak
      </div>
    </aside>
  `;

  // Render Stats Grid
  const renderStatsGrid = () => `
    <div class="stats-grid" style="margin-bottom:26px;">
      <article class="stat-card peach">
        <div class="stat-top"><span>Quizzes completed</span>${icon('check-circle-2', 18)}</div>
        <strong class="stat-value">${completed}</strong>
        <span class="stat-meta">From your completed attempts</span>
      </article>
      <article class="stat-card butter">
        <div class="stat-top"><span>Current streak</span>${icon('flame', 18)}</div>
        <strong class="stat-value">${streak} days</strong>
        <span class="stat-meta">Keep learning daily</span>
      </article>
      <article class="stat-card mint">
        <div class="stat-top"><span>Average accuracy</span>${icon('target', 18)}</div>
        <strong class="stat-value">${accuracy}%</strong>
        <span class="stat-meta">Across your quiz attempts</span>
      </article>
    </div>
  `;

  // RENDER CORRESPONDING TAB VIEW
  let tabContentHtml = '';

  if (activeTab === 'overview') {
    // Heatmap mock data: 13 weeks * 7 days = 91 cells
    const heatmapCells = Array.from({ length: 91 }, (_, i) => {
      const vals = [0, 0, 1, 0, 2, 0, 0, 3, 0, 0, 1, 4, 0, 2, 0, 1, 0];
      return vals[(i * 7 + (streak % 5)) % vals.length];
    });

    const heatmapHtml = heatmapCells.map(val => {
      let lClass = '';
      if (val === 1) lClass = 'l1';
      else if (val === 2) lClass = 'l2';
      else if (val === 3) lClass = 'l3';
      else if (val === 4) lClass = 'l4';
      return `<div class="heat-cell ${lClass}" title="Activity level: ${val}"></div>`;
    }).join('');

    // Weekly SVG Chart
    tabContentHtml = `
      <div>
        ${renderStatsGrid()}
        <div class="dashboard-content">
          <div>
            <article class="panel">
              <div class="panel-heading">
                <h2>Your learning rhythm</h2>
                <span>Live activity</span>
              </div>
              <div class="chart-wrap" style="height:160px;margin-bottom:15px;display:flex;align-items:end;gap:12px;padding:10px 0;">
                <!-- Simple styled CSS/SVG vertical bar chart -->
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:30px;background:var(--peach);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Mon</span>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:60px;background:var(--mint);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Tue</span>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:45px;background:var(--lavender);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Wed</span>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:90px;background:var(--yellow);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Thu</span>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:20px;background:var(--sky);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Fri</span>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:75px;background:var(--rose);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Sat</span>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div style="width:100%;height:10px;background:rgba(37,37,37,0.1);border-radius:4px;transition:height 0.3s;"></div>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">Sun</span>
                </div>
              </div>
            </article>

            <article class="panel" style="margin-top:14px;">
              <div class="panel-heading">
                <h2>Consistency Heatmap</h2>
                <span>Last 90 days</span>
              </div>
              <div class="heatmap" style="display:grid;grid-template-rows:repeat(7, 10px);grid-auto-flow:column;grid-auto-columns:10px;gap:3px;overflow-x:auto;padding-bottom:10px;">
                ${heatmapHtml}
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:8px;">
                <span>Less active</span>
                <span>More active</span>
              </div>
            </article>
          </div>
          <div>
            <article class="panel" style="background:var(--ink);color:var(--paper);">
              <div class="panel-heading">
                <span class="eyebrow" style="color:rgba(255,255,255,.6);">DAILY QUESTION</span>
                <span style="color:var(--yellow);">${icon('clock', 12)} Daily</span>
              </div>
              <h2 style="font-size:20px;line-height:1.2;margin:15px 0;letter-spacing:-.04em;">Practice makes consistency. Start taking public quizzes to expand your dashboard.</h2>
              <button class="dark-btn" data-action="quiz-me" style="background:var(--yellow);color:#252525;border-color:var(--yellow);width:100%;font-size:12px;">
                ${icon('dice-5', 14)} Play a Random Quiz
              </button>
            </article>
          </div>
        </div>
      </div>
    `;

  } else if (activeTab === 'bookmarks') {
    const quizBookmarks = bookmarks.filter(b => b.quizzes);
    const questionBookmarks = bookmarks.filter(b => b.questions);

    tabContentHtml = `
      <article class="panel">
        <div class="panel-heading" style="margin-bottom:28px;">
          <h2>Bookmarked Quizzes</h2>
          <span>${quizBookmarks.length} saved</span>
        </div>
        ${quizBookmarks.length > 0 ? `
          <div class="quiz-grid" style="grid-template-columns:repeat(2,1fr);">
            ${quizBookmarks.map(b => {
              const quiz = b.quizzes;
              return `
                <div class="category-card peach" style="cursor:pointer;padding:18px;min-height:120px;" data-quiz-id="${quiz.id}">
                  <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h3>${escapeHtml(quiz.title)}</h3>
                    <button class="icon-btn" data-action="remove-bookmark" data-id="${quiz.id}" style="border:0;background:none;width:auto;min-height:auto;padding:0;">${icon('bookmark-check', 16)}</button>
                  </div>
                  <p style="margin-top:6px;font-size:11px;">${escapeHtml(quiz.description || '')}</p>
                </div>`;
            }).join('')}
          </div>` : `
          <div class="empty-state">
            ${icon('bookmark', 28)}
            <span>Your saved quizzes will appear here. Click the bookmark icon on any quiz card!</span>
          </div>`}
      </article>
      
      <article class="panel" style="margin-top:20px;">
        <div class="panel-heading" style="margin-bottom:28px;">
          <h2>Saved Questions</h2>
          <span>${questionBookmarks.length} saved</span>
        </div>
        ${questionBookmarks.length > 0 ? `
          <div style="display:grid;gap:12px;">
            ${questionBookmarks.map(b => {
              const q = b.questions;
              return `
                <div class="panel" style="padding:14px;border-color:var(--line);background:var(--paper);">
                  <strong>${escapeHtml(q.prompt)}</strong>
                  <div style="font-size:11px;color:var(--muted);margin-top:6px;display:flex;justify-content:space-between;">
                    <span>Correct Answer: Option ${String.fromCharCode(65 + Number(q.answer))}</span>
                    <button class="text-btn" data-action="remove-bookmark" data-quiz-id="${q.quiz_id}" data-id="${q.id}" style="padding:0;">Remove</button>
                  </div>
                </div>`;
            }).join('')}
          </div>` : `
          <div class="empty-state">
            ${icon('help-circle', 28)}
            <span>You haven't bookmarked any specific questions yet.</span>
          </div>`}
      </article>
    `;

  } else if (activeTab === 'achievements') {
    tabContentHtml = `
      <article class="panel">
        <div class="panel-heading" style="margin-bottom:28px;">
          <h2>Achievements & Badges</h2>
          <span>${earnedAchievements.length} of ${achievements.length} unlocked</span>
        </div>
        <div class="quiz-grid" style="grid-template-columns:repeat(3, 1fr);gap:14px;">
          ${achievements.map(badge => {
            const isUnlocked = earnedAchievements.some(ea => ea.achievement_id === badge.id);
            return `
              <div class="panel" style="text-align:center;padding:22px;opacity:${isUnlocked ? 1 : 0.4};border-color:${isUnlocked ? 'var(--yellow)' : 'var(--line)'};background:${isUnlocked ? 'linear-gradient(135deg, var(--panel), #fbf8eb)' : 'var(--panel)'};">
                <div style="width:52px;height:52px;border-radius:50%;background:${isUnlocked ? 'var(--yellow)' : 'rgba(37,37,37,.1)'};color:${isUnlocked ? '#252525' : 'var(--muted)'};display:grid;place-items:center;margin:0 auto 12px;">
                  ${icon(badge.icon || 'award', 24)}
                </div>
                <h3 style="font-size:15px;margin:0 0 6px 0;">${escapeHtml(badge.name)}</h3>
                <p style="font-size:11px;color:var(--muted);line-height:1.45;margin:0;">${escapeHtml(badge.description)}</p>
                ${isUnlocked ? `<span class="tag" style="background:#cbd7d1;font-size:9px;margin-top:10px;">UNLOCKED</span>` : `<span class="tag" style="background:none;border:1px dashed var(--line);color:var(--muted);font-size:9px;margin-top:10px;">LOCKED</span>`}
              </div>`;
          }).join('')}
        </div>
      </article>
    `;

  } else if (activeTab === 'certificates') {
    tabContentHtml = `
      <article class="panel">
        <div class="panel-heading" style="margin-bottom:28px;">
          <h2>Your Certificates</h2>
          <span>${certificates.length} generated</span>
        </div>
        ${certificates.length > 0 ? `
          <div class="quiz-grid" style="grid-template-columns:repeat(2,1fr);">
            ${certificates.map(cert => {
              const certTitle = cert.quizzes?.title || cert.quiz_title || 'Quiz Completion';
              const certAcc   = cert.accuracy != null ? cert.accuracy : '';
              const certScore = cert.score != null ? cert.score : '';
              const certTotal = cert.total_questions != null ? cert.total_questions : '';
              const certDate  = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : new Date().toLocaleDateString();
              const certUser  = profile?.display_name || profile?.fullname || 'Learner';
              return `
              <div class="panel" style="padding:22px;border:2px solid var(--yellow);background:linear-gradient(135deg, var(--panel), #fbf8eb);position:relative;overflow:hidden;">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:28px;color:var(--ink);opacity:0.07;position:absolute;right:-8px;bottom:-6px;transform:rotate(-15deg);font-weight:700;pointer-events:none;">VERIFIED</div>
                <span class="eyebrow" style="font-size:8px;background:var(--yellow);color:#252525;padding:3px 8px;border-radius:8px;">QUIZVERSE CERTIFIED</span>
                <h3 style="margin:12px 0 4px;font-size:15px;">${escapeHtml(certTitle)}</h3>
                ${certAcc !== '' ? `<p style="font-size:11px;color:var(--muted);margin:0 0 4px;">Accuracy: <strong>${certAcc}%</strong>${certScore !== '' ? ` &nbsp;·&nbsp; Score: <strong>${certScore}/${certTotal}</strong>` : ''}</p>` : ''}
                <p style="font-size:10px;color:var(--muted);margin:0 0 16px;">Issued: ${certDate}</p>
                <button class="dark-btn cert-download-btn"
                  data-cert-username="${escapeHtml(certUser)}"
                  data-cert-quiz="${escapeHtml(certTitle)}"
                  data-cert-accuracy="${certAcc}"
                  data-cert-score="${certScore}"
                  data-cert-total="${certTotal}"
                  data-cert-date="${certDate}"
                  style="background:var(--yellow);color:#252525;border-color:var(--yellow);font-size:11px;min-height:30px;width:100%;">
                  ${icon('download', 12)} Download Certificate
                </button>
              </div>`;
            }).join('')}
          </div>` : `
          <div class="empty-state">
            ${icon('award', 28)}
            <span>Complete any quiz with ≥ 70% accuracy to earn an official certificate!</span>
          </div>`}
      </article>
    `;

  } else if (activeTab === 'social') {
    const requestsReceived = friends.filter(f => f.status === 'pending' && !f.isRequester);
    const friendsAccepted = friends.filter(f => f.status === 'accepted');

    tabContentHtml = `
      <div class="dashboard-content" style="grid-template-columns: 1.1fr .9fr;gap:20px;">
        <!-- Left: Global Real-time Chat -->
        <div>
          <article class="panel" style="display:flex;flex-direction:column;height:450px;">
            <div class="panel-heading" style="margin-bottom:12px;">
              <h2>Global Chat Lobby</h2>
              <span style="color:var(--yellow);">${icon('message-circle', 11)} Realtime sync</span>
            </div>
            
            <div id="chat-messages" style="flex:1;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--paper);margin-bottom:12px;display:flex;flex-direction:column;gap:8px;">
              ${chatMessages.length > 0 ? chatMessages.map(msg => `
                <div style="font-size:12px;line-height:1.45;">
                  <strong style="color:var(--ink);">${escapeHtml(msg.username)}:</strong>
                  <span style="color:var(--muted);">${escapeHtml(msg.body)}</span>
                </div>
              `).join('') : `
                <div style="color:var(--muted);text-align:center;font-size:11px;margin-top:150px;">
                  No messages yet. Say hello to other learners!
                </div>`}
            </div>

            <form id="chat-form" style="display:flex;gap:8px;">
              <input type="text" id="chat-input" placeholder="Type a message..." required autocomplete="off" style="flex:1;border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:12px;background:var(--panel);color:var(--ink);outline:none;">
              <button class="dark-btn" type="submit" style="min-height:34px;padding:0 14px;font-size:12px;">Send</button>
            </form>
          </article>
        </div>

        <!-- Right: Friends Management -->
        <div style="display:grid;gap:14px;align-content:start;">
          <!-- Add friend panel -->
          <article class="panel">
            <h2 style="font-size:16px;margin:0 0 14px 0;">Add Friend</h2>
            <form id="add-friend-form" style="display:flex;gap:8px;">
              <input type="text" id="friend-username" placeholder="Type user's username..." required style="flex:1;border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:12px;background:var(--paper);color:var(--ink);outline:none;">
              <button class="dark-btn" type="submit" style="min-height:34px;font-size:12px;">Add</button>
            </form>
            <p id="friend-error" style="font-size:11px;margin-top:8px;color:#a34f47;min-height:12px;"></p>
          </article>

          <!-- Friend requests pending -->
          ${requestsReceived.length > 0 ? `
            <article class="panel" style="border-color:var(--yellow);">
              <h2 style="font-size:14px;margin:0 0 10px 0;color:var(--yellow);">${icon('bell', 13)} Friend Requests</h2>
              <div style="display:grid;gap:8px;">
                ${requestsReceived.map(req => `
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--line);">
                    <span><strong>${escapeHtml(req.display_name)}</strong> (Lvl ${req.level})</span>
                    <div style="display:flex;gap:4px;">
                      <button class="dark-btn" data-action="accept-friend" data-id="${req.friendshipId}" data-name="${req.display_name}" style="min-height:24px;padding:0 8px;font-size:10px;background:var(--yellow);color:#252525;border-color:var(--yellow);">Accept</button>
                      <button class="ghost-btn" data-action="decline-friend" data-id="${req.friendshipId}" style="min-height:24px;padding:0 8px;font-size:10px;">Decline</button>
                    </div>
                  </div>`).join('')}
              </div>
            </article>` : ''}

          <!-- Friends List -->
          <article class="panel">
            <div class="panel-heading" style="margin-bottom:14px;">
              <h2 style="font-size:16px;">Friends</h2>
              <span>${friendsAccepted.length} online/offline</span>
            </div>
            ${friendsAccepted.length > 0 ? `
              <div style="display:grid;gap:10px;">
                ${friendsAccepted.map(friend => `
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:4px 0;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="avatar" style="width:24px;height:24px;font-size:10px;">${friend.display_name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>${escapeHtml(friend.display_name)}</strong>
                        <span style="font-size:9px;color:var(--muted);display:block;">Level ${friend.level} • ${friend.xp} XP</span>
                      </div>
                    </div>
                    <!-- Send challenge invite button -->
                    <button class="ghost-btn challenge-btn" data-action="challenge-friend" data-id="${friend.id}" data-name="${friend.display_name}" style="min-height:26px;font-size:10px;padding:0 10px;">
                      ${icon('sword', 10)} Battle
                    </button>
                  </div>`).join('')}
              </div>` : `
              <div class="empty-state" style="min-height:100px;padding:15px;">
                <span>You don't have any friends linked yet. Type a username above to start learning together!</span>
              </div>`}
          </article>
        </div>
      </div>
    `;

  } else if (activeTab === 'ai-hub') {
    tabContentHtml = `
      <div class="dashboard-content" style="grid-template-columns: 1.1fr .9fr;gap:20px;">
        <!-- Left: Quiz Generator -->
        <div>
          <article class="panel">
            <div class="panel-heading">
              <h2>AI Quiz Generator</h2>
              <span>Custom studies</span>
            </div>
            <p style="font-size:12px;color:var(--muted);margin-top:0;margin-bottom:20px;line-height:1.5;">Type a learning topic (e.g. "Quantum Physics" or "World War II") and let the AI generate a specialized quiz instantly.</p>
            
            <form id="ai-generator-form" class="generator" style="display:grid;gap:12px;">
              <label>
                Learning Topic
                <input type="text" id="ai-topic" placeholder="E.g., Space Exploration, French Vocabulary, JavaScript Promises..." required style="margin-top:6px;">
              </label>
              
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                <label>
                  Difficulty
                  <select id="ai-difficulty" style="margin-top:6px;">
                    <option value="easy">Easy</option>
                    <option value="medium" selected>Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </label>
                <label>
                  Question Count
                  <select id="ai-count" style="margin-top:6px;">
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15" selected>15 Questions</option>
                  </select>
                </label>
              </div>

              <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
                <label class="remember-field" style="color:var(--ink);font-weight:600;">
                  <input type="checkbox" id="ai-adaptive"> Enable Adaptive Difficulty
                </label>
              </div>

              <button class="dark-btn" type="submit" style="margin-top:14px;background:var(--yellow);color:#252525;border-color:var(--yellow);width:fit-content;">
                ${icon('sparkles', 14)} Generate Live Quiz ${icon('arrow-right', 14)}
              </button>
            </form>
          </article>
        </div>

        <!-- Right: AI Study Notes & Study guides -->
        <div>
          <article class="panel" style="height:100%;display:flex;flex-direction:column;">
            <h2 style="font-size:16px;margin:0 0 10px 0;">Generate Study Notes</h2>
            <p style="font-size:11px;color:var(--muted);margin:0 0 16px 0;">Read detailed bullet points outlining core concepts of any topic prompt.</p>
            <div style="display:flex;gap:8px;margin-bottom:16px;">
              <input type="text" id="ai-notes-topic" placeholder="Topic name..." style="flex:1;border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:12px;background:var(--paper);color:var(--ink);outline:none;">
              <button class="ghost-btn" id="generate-notes-btn" style="min-height:34px;font-size:12px;padding:0 14px;">Generate</button>
            </div>
            <div id="ai-notes-output" style="flex:1;border:1px dashed var(--line);border-radius:10px;padding:14px;font-size:12px;line-height:1.55;background:var(--paper);overflow-y:auto;max-height:220px;">
              <div style="color:var(--muted);text-align:center;margin-top:60px;">
                Enter a topic above to generate study notes.
              </div>
            </div>
          </article>
        </div>
      </div>
    `;

  } else if (activeTab === 'admin') {
    // Empty state placeholder for Admin content (actual elements in admin view)
    tabContentHtml = `
      <article class="panel">
        <h2 style="font-size:18px;">Switching to Admin panel...</h2>
      </article>
    `;
  }

  // Header Dashboard HTML
  return `
    <main class="dashboard container view">
      ${sidebarHtml}
      <section class="dashboard-main">
        <div class="dashboard-header">
          <div>
            <span class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <h1>Good morning, ${escapeHtml(username)}.</h1>
            <p>A small question can change the shape of your day.</p>
          </div>
          <div class="level-card">
            <div class="level-ring" style="background: conic-gradient(var(--ink) 0 ${Math.min((xp % 1000) / 10, 100)}%, rgba(37,37,37,.1) ${Math.min((xp % 1000) / 10, 100)}% 100%);">
              <b>${level}</b>
            </div>
            <div>
              <small>Total XP</small>
              <strong>${xp.toLocaleString()} XP</strong>
            </div>
          </div>
        </div>
        ${tabContentHtml}
      </section>
    </main>
  `;
}
