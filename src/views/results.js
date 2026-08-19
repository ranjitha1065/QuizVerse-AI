import { icon } from '../utils/icons.js';
import { generateAIFeedback } from '../services/ai.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function renderResults(quiz, state, profile) {
  const result = state.lastResult || { score: 0, totalQuestions: 15, accuracy: 0, timeTaken: 0, xp: 0, coins: 0, breakdown: [] };
  const username = profile?.display_name || profile?.fullname || profile?.username || state?.user?.fullName || state?.user?.username || 'Learner';
  const accuracy = Number(result.accuracy || 0);
  const score = Number(result.score || 0);
  const totalQuestions = Number(result.totalQuestions || quiz?.questions?.length || 15);
  const isPerfect = accuracy === 100;
  
  // Format duration
  const min = Math.floor(result.timeTaken / 60);
  const sec = result.timeTaken % 60;
  const timeText = min > 0 ? `${min}m ${sec}s` : `${sec}s`;

  // Performance Grade evaluation
  let gradeTag = '👑 S+ Grade - Flawless Mastery';
  let gradeBg = '#b8d9c2';
  if (accuracy < 100 && accuracy >= 80) {
    gradeTag = '🌟 A Grade - Excellent Performance';
    gradeBg = '#c3d9ef';
  } else if (accuracy < 80 && accuracy >= 60) {
    gradeTag = '👍 B Grade - Good Effort';
    gradeBg = '#f3c969';
  } else if (accuracy < 60 && accuracy >= 40) {
    gradeTag = '📖 C Grade - Keep Practicing';
    gradeBg = '#f8cfbd';
  } else if (accuracy < 40) {
    gradeTag = '💪 D Grade - Need Review';
    gradeBg = '#efb7b2';
  }

  // Determine weak and strong topics based on category
  const category = quiz.category || 'General';
  const isStrong = accuracy >= 80;

  // AI Feedback
  const aiFeedbackText = generateAIFeedback(result.score, accuracy, profile?.level || 1);

  // Detailed Breakdown List HTML
  const breakdownList = (result.breakdown || []).map((item, idx) => {
    const isCorrect = item.isCorrect;
    const userOptText = item.userAnswer !== null && item.userAnswer !== undefined && item.options?.[item.userAnswer]
      ? (item.options[item.userAnswer].value || item.options[item.userAnswer])
      : 'No answer selected';
    const correctOptText = item.options?.[item.correctAnswer]
      ? (item.options[item.correctAnswer].value || item.options[item.correctAnswer])
      : 'Option A';

    return `
      <div style="border-bottom:1px solid var(--line);padding:14px 0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <strong style="font-size:13px;display:block;margin-bottom:4px;">${idx + 1}. ${escapeHtml(item.prompt)}</strong>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
              Your answer: <span style="font-weight:600;color:${isCorrect ? '#2e7d32' : '#c62828'};">${escapeHtml(userOptText)}</span>
              ${!isCorrect ? ` • Correct answer: <span style="font-weight:600;color:#2e7d32;">${escapeHtml(correctOptText)}</span>` : ''}
            </div>
            ${item.explanation ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;font-style:italic;">💡 ${escapeHtml(item.explanation)}</div>` : ''}
          </div>
          <span style="padding:3px 8px;border-radius:12px;font-size:10px;font-weight:bold;background:${isCorrect ? '#b8d9c2' : '#efb7b2'};color:#252525;white-space:nowrap;">
            ${isCorrect ? 'Correct (+10 XP)' : 'Incorrect (0 XP)'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Certificate Render HTML (Awarded for Passing Score >= 70%)
  const isPassed = accuracy >= 70;
  const certificateHtml = isPassed ? `
    <article class="panel" style="border: 2px solid var(--yellow);background:linear-gradient(135deg, var(--panel), #fbf8eb);padding:30px;text-align:center;position:relative;overflow:hidden;margin-bottom:20px;grid-column:1/-1;">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:38px;color:var(--ink);opacity:0.06;position:absolute;right:0;bottom:0;transform:rotate(-12deg);font-weight:700;">VERIFIED</div>
      <span class="eyebrow" style="margin:0 auto 10px;width:fit-content;background:var(--yellow);color:#252525;padding:4px 12px;border-radius:12px;font-weight:700;">👑 OFFICIAL VERIFIED CERTIFICATE</span>
      
      <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:28px;margin:15px 0 5px;letter-spacing:-.04em;">${escapeHtml(username)}</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 20px 0;">has successfully demonstrated high performance and passed the course quiz:</p>
      
      <h3 style="font-size:20px;letter-spacing:-.04em;margin:5px 0 25px 0;color:var(--ink);">${escapeHtml(quiz.title)}</h3>
      
      <div style="display:flex;justify-content:center;gap:40px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:20px;max-width:320px;margin:0 auto;">
        <div>
          <strong>${new Date().toLocaleDateString()}</strong>
          <div style="font-size:9px;margin-top:2px;">ISSUE DATE</div>
        </div>
        <div>
          <strong>${accuracy}%</strong>
          <div style="font-size:9px;margin-top:2px;">ACCURACY</div>
        </div>
        <div>
          <strong>${score}/${totalQuestions}</strong>
          <div style="font-size:9px;margin-top:2px;">SCORE</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;margin-top:22px;flex-wrap:wrap;">
        <button class="dark-btn" id="download-cert-btn"
          data-username="${escapeHtml(username)}"
          data-quiz="${escapeHtml(quiz.title)}"
          data-accuracy="${accuracy}"
          data-score="${score}"
          data-total="${totalQuestions}"
          style="background:var(--yellow);color:#252525;border-color:var(--yellow);font-size:12px;">
          ${icon('download', 14)} Download Certificate
        </button>
        <button class="dark-btn" id="print-cert-btn" style="font-size:12px;min-height:34px;">
          ${icon('printer', 14)} Print
        </button>
      </div>
    </article>
  ` : '';

  // Return completion details view
  return `
    <main class="view container" style="padding-top:40px;padding-bottom:80px;max-width:820px;">
      <!-- RESULTS TOP CARD -->
      <article class="panel" style="text-align:center;padding:40px 30px;margin-bottom:24px;background:linear-gradient(135deg, var(--panel), ${isPerfect ? 'var(--mint)' : 'var(--peach)'});">
        <div style="width:64px;height:64px;border-radius:50%;background:${isPerfect ? 'var(--mint)' : 'var(--peach)'};color:var(--ink);display:grid;place-items:center;margin:0 auto 16px;">
          ${icon(isPerfect ? 'trophy' : 'check', 32)}
        </div>
        <span class="eyebrow" style="margin:0 auto 10px;width:fit-content;background:${gradeBg};color:#252525;padding:4px 12px;border-radius:12px;font-weight:700;">${gradeTag}</span>
        <h1 style="font-size:36px;letter-spacing:-.06em;margin:14px 0 6px;">Good job, ${escapeHtml(username)}!</h1>
        <p style="color:var(--muted);font-size:13.5px;max-width:480px;margin:0 auto;">
          You answered <strong>${score}</strong> out of <strong>${totalQuestions}</strong> questions correctly (${accuracy}% accuracy).
        </p>
      </article>

      <!-- METRICS GRID -->
      <div class="stats-grid" style="margin-bottom:24px;grid-template-columns:repeat(4,1fr);">
        <div class="results-stat-chip">
          <span>Score</span>
          <strong style="color:var(--yellow);">${score}/${totalQuestions}</strong>
        </div>
        <div class="results-stat-chip">
          <span>Time</span>
          <strong>${timeText}</strong>
        </div>
        <div class="results-stat-chip">
          <span>XP Gained</span>
          <strong class="xp-earned-counter" style="color:#b8d9c2;">+${result.xp}</strong>
        </div>
        <div class="results-stat-chip">
          <span>Coins</span>
          <strong class="xp-earned-counter" style="color:var(--yellow);">+${result.coins}</strong>
        </div>
      </div>

      <!-- ANALYTICS ROW -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <!-- Left: AI Feedback & Study recommendations -->
        <article class="panel" style="padding:22px;">
          <div class="panel-heading" style="margin-bottom:12px;">
            <h2>AI Performance Feedback</h2>
            <span>Synthesis</span>
          </div>
          <p style="font-size:12.5px;line-height:1.6;color:var(--ink);margin:0;">"${escapeHtml(aiFeedbackText)}"</p>
        </article>

        <!-- Right: Topic Performance -->
        <article class="panel" style="padding:22px;">
          <div class="panel-heading" style="margin-bottom:12px;">
            <h2>Topic Analysis</h2>
            <span>Insights</span>
          </div>
          
          <div style="display:grid;gap:12px;">
            <div>
              <span class="tag" style="background:#cbd7d1;font-size:9px;">${isStrong ? 'STRONG TOPIC' : 'NEEDS PRACTICE'}</span>
              <h3 style="font-size:16px;margin:6px 0 4px 0;">${escapeHtml(category)}</h3>
              <p style="font-size:11px;color:var(--muted);margin:0;">
                ${isStrong ? 'You have demonstrated excellent comprehension of this topic. Great job!' : 'We recommend reviewing study notes or retrying questions from this category.'}
              </p>
            </div>
          </div>
        </article>
      </div>

      <!-- DETAILED QUESTION-BY-QUESTION BREAKDOWN -->
      ${breakdownList ? `
        <article class="panel" style="padding:24px;margin-bottom:24px;">
          <div class="panel-heading" style="margin-bottom:16px;">
            <h2>Detailed Evaluation Breakdown (${score}/${totalQuestions})</h2>
            <span>Question Performance</span>
          </div>
          ${breakdownList}
        </article>
      ` : ''}

      <!-- CERTIFICATE -->
      ${certificateHtml}

      <!-- ACTIONS -->
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-md);padding:18px 24px;">
        <div style="display:flex;gap:12px;">
          <button class="dark-btn" id="results-retry-btn" data-quiz-id="${quiz.id}" style="min-height:36px;font-size:12px;">
            ${icon('refresh-cw', 13)} Retry Quiz
          </button>
          <button class="ghost-btn" data-view="dashboard" style="min-height:36px;font-size:12px;">
            Go to My Space
          </button>
        </div>
        
        <button class="ghost-btn" id="results-share-btn" data-title="${escapeHtml(quiz.title)}" data-score="${accuracy}" style="min-height:36px;font-size:12px;">
          ${icon('share-2', 13)} Share Result
        </button>
      </div>
    </main>
  `;
}
