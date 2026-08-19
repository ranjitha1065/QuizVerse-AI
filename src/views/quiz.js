import { icon } from '../utils/icons.js';
import { getCorrectOptionIndex, getOptionText } from '../utils/quiz.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function renderQuiz(quiz, currentIdx, answers, selectedIndex, answered, showHint, isPaused, secondsLeft, isBookmarked = false) {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return `
      <main class="container view" style="padding:80px 0;text-align:center;">
        <h2>No questions found for this quiz.</h2>
        <button class="dark-btn" data-view="discover" style="margin-top:20px;">Go Back Discover</button>
      </main>
    `;
  }

  const question = quiz.questions[currentIdx];
  const totalQuestions = quiz.questions.length;
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100);
  const correctOptionIdx = getCorrectOptionIndex(question);

  // Timer rendering
  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  const timerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  // Option buttons
  const optionsHtml = (question.options || []).map((opt, idx) => {
    // If answered, show green/red correctness classes
    const isSelected = selectedIndex === idx;
    let cls = '';
    
    if (answered) {
      if (idx === correctOptionIdx) {
        cls = 'correct';
      } else if (isSelected) {
        cls = 'wrong';
      }
    } else if (isSelected) {
      cls = 'selected';
    }

    const optText = getOptionText(opt);

    return `
      <button class="option ${cls}" data-option-idx="${idx}" ${answered ? 'disabled' : ''} style="width:100%;text-align:left;display:flex;align-items:center;margin-bottom:8px;">
        <span style="font-weight:bold;margin-right:12px;background:rgba(255,255,255,.15);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;">
          ${String.fromCharCode(65 + idx)}
        </span>
        <span>${escapeHtml(optText)}</span>
      </button>
    `;
  }).join('');

  // Explanation section HTML
  const explanationHtml = answered ? `
    <div class="panel" style="background:var(--paper);border-color:var(--line);margin-top:22px;animation:pageIn 0.3s ease;">
      <h3 style="margin-top:0;font-size:16px;">
        ${selectedIndex === correctOptionIdx ? `<span style="color:#b8d9c2;">${icon('check-circle-2', 16)} Correct!</span>` : `<span style="color:#efb7b2;">${icon('alert-circle', 16)} Incorrect</span>`}
      </h3>
      <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:8px 0 16px;">${escapeHtml(question.explanation || 'No detailed explanation provided.')}</p>
      
      <button class="dark-btn" id="next-question-btn" style="min-height:34px;font-size:12px;">
        ${currentIdx < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'} ${icon('arrow-right', 13)}
      </button>
    </div>
  ` : '';

  // Hint section HTML
  const hintHtml = showHint ? `
    <div style="background:rgba(243, 201, 105, 0.15);border:1px dashed var(--yellow);color:var(--ink);border-radius:10px;padding:12px;font-size:11px;margin-bottom:14px;line-height:1.5;">
      <strong>💡 Hint:</strong> ${escapeHtml(question.hint || 'No hint available.')}
    </div>
  ` : '';

  // Palette HTML circles
  const paletteHtml = quiz.questions.map((_, idx) => {
    const isCurrent = idx === currentIdx;
    const isAnswered = answers[idx] !== undefined && answers[idx] !== null;
    
    let cellStyle = 'background:rgba(37,37,37,.06);color:var(--muted);border:1px solid transparent;';
    if (isCurrent) {
      cellStyle = 'background:var(--ink);color:var(--paper);border:1px solid var(--ink);font-weight:bold;';
    } else if (isAnswered) {
      cellStyle = 'background:#b8d9c2;color:#252525;border:1px solid #b8d9c2;';
    }

    return `
      <button class="palette-cell" data-jump-question="${idx}" style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:10px;cursor:pointer;${cellStyle}">
        ${idx + 1}
      </button>
    `;
  }).join('');

  // Pause overlay vs active question area
  const mainAreaHtml = isPaused ? `
    <div class="empty-state" style="min-height:320px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:18px;">
      <div style="width:60px;height:60px;border-radius:50%;background:rgba(37,37,37,0.1);display:grid;place-items:center;">
        ${icon('pause', 32)}
      </div>
      <h2>Quiz is Paused</h2>
      <p style="color:var(--muted);font-size:12px;margin-top:-8px;">Your progress and timer are frozen.</p>
      <button class="dark-btn" id="resume-quiz-btn" style="background:var(--yellow);color:#252525;border-color:var(--yellow);">${icon('play', 15)} Resume Quiz</button>
    </div>
  ` : `
    <div style="display:grid;grid-template-columns:1.4fr .6fr;gap:26px;">
      <!-- Left: Active Question -->
      <div>
        <div class="panel question-card" style="margin-top:0;padding:26px;">
          <div class="panel-heading" style="margin-bottom:12px;">
            <span class="eyebrow" style="color:rgba(255,255,255,0.7);">Question ${currentIdx + 1} of ${totalQuestions}</span>
            <span style="color:var(--yellow);">${question.points || 10} XP</span>
          </div>
          
          <h2 style="font-size:24px;line-height:1.2;margin:18px 0 24px;letter-spacing:-.05em;color:var(--paper);">${escapeHtml(question.prompt)}</h2>
          
          ${hintHtml}
          
          <div class="options">${optionsHtml}</div>
          
          ${explanationHtml}
        </div>
      </div>

      <!-- Right: Palette & Metadata -->
      <div style="display:grid;gap:14px;align-content:start;">
        <!-- Question Palette -->
        <article class="panel">
          <h3 style="font-size:14px;margin:0 0 14px 0;">Question Palette</h3>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
            ${paletteHtml}
          </div>
        </article>

        <!-- Help tools -->
        <article class="panel" style="padding:18px;font-size:11px;color:var(--muted);line-height:1.5;">
          <strong>Keyboard Shortcuts:</strong><br>
          • Press <strong>1, 2, 3, 4</strong> to pick options A, B, C, D.<br>
          • Press <strong>Space</strong> to skip/next.<br>
          • Press <strong>Escape</strong> to pause/resume.<br>
          • Press <strong>V</strong> to read aloud.
        </article>
      </div>
    </div>
  `;

  return `
    <main class="view container" style="padding-top:20px;padding-bottom:80px;">
      <!-- TOP STATUS BAR -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div>
          <a class="brand" href="#" data-view="discover">${icon('sparkles', 16)} QuizVerse</a>
          <span style="color:var(--muted);font-size:12px;margin-left:10px;">/ ${escapeHtml(quiz.title)}</span>
        </div>
        
        <!-- CONTROL BAR -->
        <div style="display:flex;align-items:center;gap:8px;">
          <!-- Timer text and buttons -->
          <div style="display:flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:4px 10px 4px 6px;font-size:12px;font-family:monospace;font-weight:600;">
            <button id="pause-toggle-btn" style="border:0;background:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;cursor:pointer;">
              ${icon(isPaused ? 'play' : 'pause', 12)}
            </button>
            <span style="margin-left:-2px;">${timerText}</span>
          </div>

          <!-- Text-to-speech button -->
          <button class="icon-btn" id="tts-speak-btn" title="Read Aloud (Keyboard: V)">
            ${icon('volume-2', 15)}
          </button>

          <!-- Hint button -->
          <button class="icon-btn" id="hint-toggle-btn" title="Toggle Hint" ${answered ? 'disabled' : ''}>
            ${icon('lightbulb', 15)}
          </button>

          <!-- Bookmark button -->
          <button class="icon-btn" id="quiz-bookmark-btn" title="Bookmark Question">
            ${icon(isBookmarked ? 'bookmark-check' : 'bookmark', 15)}
          </button>

          <!-- Fullscreen button -->
          <button class="icon-btn" id="fullscreen-toggle-btn" title="Toggle Fullscreen">
            ${icon('maximize', 15)}
          </button>
        </div>
      </div>

      <!-- PROGRESS BAR -->
      <div class="progress" style="margin-bottom:28px;height:6px;">
        <span style="width:${progressPercent}%"></span>
      </div>

      <!-- MAIN AREA -->
      ${mainAreaHtml}
    </main>
  `;
}
