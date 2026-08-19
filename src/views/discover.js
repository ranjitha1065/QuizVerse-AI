import { icon } from '../utils/icons.js';
import { supabaseEnabled } from '../services/supabase.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function renderDiscover(state, categories, quizzes, leaderboard, activityLog, challenges, activeAttempts = [], profile = null) {
  const featuredQuiz = quizzes[0];
  const isLoggedIn = !!state.userId;
  const displayName = profile?.display_name || profile?.fullname || state?.user?.fullName || 'Learner';
  const firstName = displayName.split(' ')[0];
  const xp = profile?.xp ?? state.xp ?? 0;
  const level = profile?.level ?? state.level ?? 1;
  const streak = profile?.streaks?.current_streak ?? state.streak ?? 0;
  const xpToNext = (level * 200);
  const xpPct = Math.min(100, Math.round((xp % xpToNext) / xpToNext * 100));

  // Greeting by time
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  // Testimonials list
  const testimonials = [
    { name: "Sarah K.", role: "Product Designer", text: "QuizVerse made micro-learning an addictive daily habit. The design is so clean!" },
    { name: "Alex M.", role: "CS Student", text: "The creative coding quizzes are top-notch. Love the interactive layout." }
  ];

  // Helper for rendering quiz cards
  const renderQuizCard = (quiz, index) => {
    const isBookmarked = state.bookmarked?.includes(quiz.id);
    return `
      <article class="quiz-card fade-up delay-${index % 4}" data-quiz-id="${quiz.id}">
        <div class="quiz-cover ${escapeHtml(quiz.color || 'mint')}" ${quiz.image_url ? `style="background-image:url('${escapeHtml(quiz.image_url)}');background-size:cover"` : ''}>
          <div class="card-top">
            <span>${escapeHtml(quiz.category)}</span>
            <button class="icon-btn bookmark-btn" data-action="toggle-bookmark" data-id="${quiz.id}" aria-label="Bookmark" style="border:0;background:none;padding:0;min-height:auto;width:auto;">
              ${icon(isBookmarked ? 'bookmark-check' : 'bookmark', 16)}
            </button>
          </div>
          <div class="quiz-graphic">${icon(quiz.icon || 'sparkles', 54)}</div>
          <div class="card-top">
            <span>${quiz.questions} questions</span>
            <span>${escapeHtml(quiz.time)}</span>
          </div>
        </div>
        <div class="quiz-body">
          <span class="tag">${escapeHtml(quiz.difficulty)}</span>
          <h3>${escapeHtml(quiz.title)}</h3>
          <p>${escapeHtml(quiz.description || '')}</p>
          <div class="quiz-meta">
            <span>${icon('star', 14)} ${Number(quiz.rating || 0).toFixed(1)}</span>
            <span>${icon('users', 14)} ${Number(quiz.plays || 0).toLocaleString()} plays</span>
            <span>${icon('heart', 14)} ${Number(quiz.likes || 0).toLocaleString()}</span>
          </div>
          <small class="quiz-creator">Created by ${escapeHtml(quiz.creator)}</small>
        </div>
      </article>`;
  };

  // 1. Categories Grid HTML
  const categoryCardsHtml = categories.map((category, index) => {
    const isActive = state.discoverFilters?.category === category.name;
    return `
    <button class="category-card ${category.color || 'peach'} ${isActive ? 'active-filter' : ''} fade-up delay-${index % 3}" data-category="${escapeHtml(category.name)}">
      <div class="category-icon">${icon(category.icon || 'palette', 19)}</div>
      <h3>${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.description || '')}</p>
      <div class="category-footer">
        <span>${escapeHtml(category.quiz_count !== undefined ? `${category.quiz_count} quizzes` : category.count || '0 quizzes')}</span>
        ${icon('arrow-up-right', 15)}
      </div>
    </button>`;
  }).join('');

  // 2. Active attempts (Continue Learning)
  const continueLearningHtml = activeAttempts.length > 0 ? `
    <section class="section container" id="continue-learning" style="padding-top:40px;padding-bottom:40px;">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Pick up where you left off</span>
          <h2>Continue <span class="serif">learning.</span></h2>
        </div>
      </div>
      <div class="quiz-grid">
        ${activeAttempts.map((attempt, index) => {
          const quiz = attempt.quizzes;
          if (!quiz) return '';
          const progressPercent = Math.round((attempt.current_question / (quiz.total_questions || 5)) * 100);
          return `
            <article class="quiz-card continue-card" data-resume-attempt="${attempt.id}" style="border-color:var(--yellow);">
              <div class="quiz-body" style="padding:22px;">
                <span class="tag" style="background:var(--yellow);">${progressPercent}% completed</span>
                <h3 style="margin-top:12px;">${escapeHtml(quiz.title)}</h3>
                <p>Question ${attempt.current_question + 1} of ${quiz.total_questions || 5}</p>
                <div class="progress" style="margin:18px 0;height:4px;"><span style="width:${progressPercent}%"></span></div>
                <button class="dark-btn" style="width:100%;font-size:12px;min-height:34px;">Resume attempt ${icon('arrow-right', 12)}</button>
              </div>
            </article>`;
        }).join('')}
      </div>
    </section>` : '';

  // 3. Quizzes list rendering
  const quizzesHtml = quizzes.length > 0 ? quizzes.map((q, i) => renderQuizCard(q, i)).join('') : `
    <div class="empty-state" style="grid-column:1/-1;width:100%;min-height:200px;">
      ${icon('search', 28)}
      <span>No quizzes match your filters. Try search terms or filters.</span>
    </div>`;

  // 4. Daily Challenge Panel
  const dailyChallengeHtml = challenges?.daily ? `
    <article class="stat-card butter daily-challenge-card" data-quiz-id="${challenges.daily.quiz_id}" style="cursor:pointer;grid-column:span 2;display:flex;justify-content:space-between;align-items:center;">
      <div style="flex:1;">
        <span class="eyebrow" style="font-size:9px;">DAILY HIGHLIGHT</span>
        <h3 style="margin:8px 0 4px;font-size:22px;letter-spacing:-.04em;">Daily Challenge</h3>
        <p style="color:var(--muted);font-size:12px;margin:0 0 10px;">Play today's featured quiz for a bonus reward.</p>
        <div style="display:flex;gap:12px;font-size:12px;font-weight:600;">
          <span style="color:var(--ink);">${icon('flame', 14)} +${challenges.daily.bonus_xp} XP Bonus</span>
          <span id="challenge-timer" style="color:var(--muted);font-family:monospace;">00:00:00 remaining</span>
        </div>
      </div>
      <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.5);display:grid;place-items:center;">
        ${icon('play', 20)}
      </div>
    </article>` : `
    <article class="stat-card butter" style="grid-column:span 2;">
      <div class="stat-top"><span>Daily Challenge</span>${icon('flame', 18)}</div>
      <strong class="stat-value">+300 XP</strong>
      <span class="stat-meta">Daily challenges will update tomorrow.</span>
    </article>`;

  // 5. Top Players List
  const topPlayersHtml = leaderboard.length > 0 ? leaderboard.slice(0, 5).map((player, index) => {
    const initials = player.display_name?.slice(0, 2).toUpperCase() || 'JD';
    const isMe = state.userId === player.id;
    return `
      <div class="player-rank-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);${isMe ? 'font-weight:bold;color:var(--yellow);' : ''}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--muted);width:16px;">#${index + 1}</span>
          <div class="avatar" style="width:28px;height:28px;font-size:11px;background:${isMe ? 'var(--yellow)' : '#cbd7d1'};">${initials}</div>
          <span style="font-size:13px;">${escapeHtml(player.display_name)}</span>
        </div>
        <div style="text-align:right;font-size:12px;">
          <strong>${player.xp.toLocaleString()}</strong> <span style="color:var(--muted);font-size:10px;">XP</span>
        </div>
      </div>`;
  }).join('') : `<div class="empty-state">${icon('users', 20)} <span>No leaderboard entries.</span></div>`;

  // 6. Community Activity Feed
  const activityHtml = activityLog.length > 0 ? activityLog.slice(0, 5).map(act => {
    const initials = act.profiles?.display_name?.slice(0, 2).toUpperCase() || 'JD';
    let activityText = '';
    
    if (act.type === 'quiz_completed') {
      activityText = `completed <strong>${escapeHtml(act.metadata?.quizTitle || 'a quiz')}</strong> with ${act.metadata?.accuracy}% accuracy`;
    } else if (act.type === 'badge_earned') {
      activityText = `earned the <strong>${escapeHtml(act.metadata?.badgeName || 'achievement')}</strong> badge`;
    } else if (act.type === 'friend_accepted') {
      activityText = `is now friends with <strong>${escapeHtml(act.metadata?.friendName || 'another learner')}</strong>`;
    } else {
      activityText = `is active on the platform`;
    }

    return `
      <div class="activity-item" style="display:flex;align-items:start;gap:10px;padding:8px 0;font-size:11px;line-height:1.4;border-bottom:1px dashed var(--line);">
        <div class="avatar" style="width:22px;height:22px;font-size:9px;margin-top:2px;">${initials}</div>
        <div>
          <strong>${escapeHtml(act.profiles?.display_name || 'Someone')}</strong> ${activityText}
          <div style="color:var(--muted);font-size:9px;margin-top:2px;">${new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>`;
  }).join('') : `<div class="empty-state">${icon('activity', 20)} <span>No community events yet.</span></div>`;

  // Return full HTML structure
  return `
    <main class="view">
      <!-- HERO -->
      ${isLoggedIn ? `
        <section class="hero-logged-in container">
          <div>
            <span class="eyebrow">${greeting}, ${firstName}!</span>
            <h1>Welcome back <span class="serif">to QuizVerse.</span></h1>
            <p style="color:var(--muted);font-size:15px;max-width:550px;margin:8px 0 20px;">
              Ready to challenge yourself today? Check out your stats below or jump directly to daily recommendations.
            </p>
            <div class="hero-stats-row">
              <div class="hero-stat-pill">
                ${icon('flame', 18)} <span>Streak: <strong>${streak} days</strong></span>
              </div>
              <div class="hero-stat-pill">
                ${icon('zap', 18)} <span>Total XP: <strong>${xp}</strong></span>
              </div>
              <div class="hero-stat-pill">
                ${icon('award', 18)} <span>Level: <strong>${level}</strong></span>
              </div>
            </div>
            
            <div class="xp-bar-wrap" style="max-width:400px;margin-top:20px;">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:6px;">
                <span>Progress to Level ${level + 1}</span>
                <span>${xp % xpToNext} / ${xpToNext} XP</span>
              </div>
              <div class="xp-bar-track">
                <div class="xp-bar-fill" style="width:${xpPct}%"></div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="dark-btn" id="hero-quick-play-btn" style="background:var(--yellow);color:#252525;border-color:var(--yellow);">
              ${icon('play', 16)} Start Today's Challenge
            </button>
            <button class="ghost-btn" id="hero-quiz-me-btn">
              🎲 Random Quiz Me
            </button>
          </div>
        </section>
      ` : `
        <section class="hero container">
          <div class="hero-copy-wrap fade-up">
            <span class="eyebrow">A smarter way to stay curious</span>
            <h1>Make learning feel <span class="serif">like play.</span></h1>
            <p class="hero-copy">Beautifully crafted quizzes for the things you care about. Build a daily practice, find your people, and keep a little more of the world in your head.</p>
            <div class="hero-actions">
              <button class="dark-btn" data-view="dashboard">Explore today's quizzes ${icon('arrow-right', 16)}</button>
              <a href="#categories" class="ghost-btn">Browse categories</a>
            </div>
            <div class="hero-note">
              ${icon('database', 14)} 
              <strong>${supabaseEnabled ? 'Live Supabase real-time connection enabled' : 'Fallback offline mode active'}</strong>
            </div>
          </div>
          <div class="hero-visual fade-up delay-2">
            <div class="orbit"></div>
            <div class="hero-card main">
              <div class="card-top"><span>Featured quiz</span>${icon('sparkles', 15)}</div>
              <h2 class="card-title" style="cursor:pointer;" data-quiz-id="${featuredQuiz?.id || ''}">
                ${escapeHtml(featuredQuiz?.title || 'No published quizzes yet')}
              </h2>
              <div class="progress"><span style="width:${featuredQuiz ? 100 : 0}%"></span></div>
              <div class="progress-meta">
                <span>${featuredQuiz ? `${featuredQuiz.questions} questions` : 'Publish a quiz to begin'}</span>
                <span>${featuredQuiz?.time || '0 min'}</span>
              </div>
            </div>
            <div class="hero-card side">
              <div class="card-top"><span>YOUR STREAK</span>${icon('flame', 14)}</div>
              <strong style="font-size:38px;display:block;margin:18px 0 4px">${state.streak || 0}</strong>
              <span style="color:var(--muted);font-size:11px">days in a row</span>
            </div>
          </div>
        </section>
      `}

      <!-- CONTINUE LEARNING -->
      ${continueLearningHtml}

      <!-- CATEGORIES -->
      <section class="section container" id="categories">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Find your next rabbit hole</span>
            <h2>Something for every<br><span class="serif">kind of curious.</span></h2>
          </div>
          <p>Short, thoughtful quizzes that meet you where you are and leave you wanting one more.</p>
        </div>
        <div class="category-grid">${categoryCardsHtml}</div>
      </section>

      <!-- DISCOVER FILTER BAR & QUIZZES -->
      <section class="section container" id="featured">
        <div class="section-heading" style="margin-bottom:12px;">
          <div>
            <span class="eyebrow">Discover Quizzes</span>
            <h2>Pick a <span class="serif">good one.</span></h2>
          </div>
        </div>

        <!-- SEARCH AND FILTER INTERFACE -->
        <div class="search-filter-panel" style="margin-bottom:30px;padding:20px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-md);display:grid;grid-template-columns:1.5fr repeat(3, 1fr) auto;gap:12px;align-items:center;">
          <div style="position:relative;">
            <input type="text" id="search-input" placeholder="Search title, description..." value="${escapeHtml(state.discoverSearch || '')}" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 12px 9px 36px;color:var(--ink);background:var(--paper);outline:none;font-size:13px;">
            <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);">${icon('search', 14)}</div>
          </div>
          <div>
            <select id="filter-category" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:var(--ink);background:var(--paper);outline:none;font-size:13px;">
              <option value="All">All Categories</option>
              ${categories.map(c => `<option value="${escapeHtml(c.name)}" ${state.discoverFilters?.category === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <select id="filter-difficulty" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:var(--ink);background:var(--paper);outline:none;font-size:13px;">
              <option value="All">All Difficulties</option>
              <option value="Easy" ${state.discoverFilters?.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
              <option value="Medium" ${state.discoverFilters?.difficulty === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Hard" ${state.discoverFilters?.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
              <option value="Expert" ${state.discoverFilters?.difficulty === 'Expert' ? 'selected' : ''}>Expert</option>
            </select>
          </div>
          <div>
            <select id="filter-duration" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:var(--ink);background:var(--paper);outline:none;font-size:13px;">
              <option value="All">All Durations</option>
              <option value="Short (< 5 min)" ${state.discoverFilters?.duration === 'Short (< 5 min)' ? 'selected' : ''}>Short (< 5 min)</option>
              <option value="Medium (5-15 min)" ${state.discoverFilters?.duration === 'Medium (5-15 min)' ? 'selected' : ''}>Medium (5-15 min)</option>
              <option value="Long (> 15 min)" ${state.discoverFilters?.duration === 'Long (> 15 min)' ? 'selected' : ''}>Long (> 15 min)</option>
            </select>
          </div>
          <div>
            <select id="filter-sort" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:var(--ink);background:var(--paper);outline:none;font-size:13px;">
              <option value="Newest" ${state.discoverFilters?.sort === 'Newest' ? 'selected' : ''}>Newest</option>
              <option value="Popularity" ${state.discoverFilters?.sort === 'Popularity' ? 'selected' : ''}>Popularity</option>
              <option value="Highest Rated" ${state.discoverFilters?.sort === 'Highest Rated' ? 'selected' : ''}>Highest Rated</option>
            </select>
          </div>
        </div>

        <div class="quiz-grid">${quizzesHtml}</div>
      </section>

      <!-- METRICS, DAILY HIGHLIGHT, FEED & LEADERBOARD -->
      <section class="section container" id="about">
        <div class="stats-grid">
          ${dailyChallengeHtml}
          <article class="stat-card peach">
            <div class="stat-top"><span>Average Rating</span>${icon('star', 18)}</div>
            <strong class="stat-value">
              ${quizzes.length ? (quizzes.reduce((sum, q) => sum + Number(q.rating || 0), 0) / quizzes.length).toFixed(1) : '0.0'}
            </strong>
            <span class="stat-meta">Across published quizzes</span>
          </article>
        </div>

        <!-- Social Activity Row -->
        <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:20px;margin-top:20px;">
          <!-- Left panel: Community Activity Feed -->
          <article class="panel">
            <div class="panel-heading">
              <h2>Community Activity</h2>
              <span>Recent events</span>
            </div>
            <div class="activity-feed-list" style="max-height:280px;overflow:auto;padding-right:5px;">
              ${activityHtml}
            </div>
          </article>

          <!-- Right panel: Leaderboard Top 5 -->
          <article class="panel">
            <div class="panel-heading">
              <h2>Top Players</h2>
              <span>XP Standings</span>
            </div>
            <div class="leaderboard-list">
              ${topPlayersHtml}
            </div>
          </article>
        </div>
      </section>

      <!-- TESTIMONIALS -->
      <section class="section container" id="testimonials" style="border-top:1px solid var(--line);padding-top:60px;padding-bottom:60px;">
        <div class="section-heading" style="text-align:center;display:block;margin-bottom:40px;">
          <span class="eyebrow" style="margin:0 auto 12px;width:fit-content;">What learners say</span>
          <h2>Loved by curious minds.</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;">
          ${testimonials.map(t => `
            <article class="panel" style="padding:26px;">
              <p style="font-style:italic;font-size:14px;line-height:1.65;color:var(--muted);margin:0 0 16px 0;">"${escapeHtml(t.text)}"</p>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="avatar" style="width:30px;height:30px;font-size:12px;background:var(--yellow);">${t.name.slice(0, 2)}</div>
                <div>
                  <strong style="font-size:13px;display:block;">${escapeHtml(t.name)}</strong>
                  <span style="font-size:10px;color:var(--muted);">${escapeHtml(t.role)}</span>
                </div>
              </div>
            </article>`).join('')}
        </div>
      </section>

      <!-- CTA -->
      <section class="cta container">
        <span class="eyebrow">Your curious era starts here</span>
        <h2>A better habit is one beautiful question away.</h2>
        <button class="ghost-btn" data-view="dashboard">Create your free space ${icon('arrow-right', 16)}</button>
      </section>
    </main>
  `;
}
