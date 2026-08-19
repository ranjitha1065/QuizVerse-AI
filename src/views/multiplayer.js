import { icon } from '../utils/icons.js';
import { getOptionText } from '../utils/quiz.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function renderMultiplayer(state, room, players, quiz, currentQuestionIdx, messages) {
  // 1. LOBBY ENTRY STATE (Not inside any room)
  if (!room) {
    return `
      <main class="container view" style="padding-top:40px;padding-bottom:80px;max-width:560px;">
        <article class="panel" style="padding:30px;text-align:center;">
          <div style="width:54px;height:54px;border-radius:50%;background:var(--yellow);color:#252525;display:grid;place-items:center;margin:0 auto 16px;">
            ${icon('sword', 26)}
          </div>
          <span class="eyebrow" style="margin:0 auto 10px;width:fit-content;">MULTIPLAYER BATTLES</span>
          <h1 style="font-size:32px;letter-spacing:-.06em;margin:10px 0 6px;">Multiplayer Arena</h1>
          <p style="color:var(--muted);font-size:12px;margin:0 0 24px;">Create a room or join your friend's room code to challenge each other in real-time.</p>
          
          <div style="display:grid;gap:12px;margin-bottom:20px;">
            <div style="border:1px solid var(--line);border-radius:12px;padding:18px;background:var(--paper);">
              <h3 style="margin-top:0;font-size:15px;margin-bottom:10px;">Join an Existing Room</h3>
              <form id="join-room-form" style="display:flex;gap:8px;">
                <input type="text" id="join-code-input" placeholder="ENTER 6-LETTER CODE" required maxlength="6" autocomplete="off" style="flex:1;border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:13px;text-align:center;text-transform:uppercase;font-family:monospace;background:var(--panel);color:var(--ink);outline:none;">
                <button class="dark-btn" type="submit" style="min-height:36px;font-size:12px;">Join Battle</button>
              </form>
            </div>
            
            <div style="border:1px dashed var(--line);border-radius:12px;padding:18px;">
              <h3 style="margin-top:0;font-size:15px;margin-bottom:10px;">Host a New Battle</h3>
              <p style="color:var(--muted);font-size:11px;margin-bottom:14px;margin-top:0;">Select a quiz from discover to host a custom match, or generate a random hosted room.</p>
              <button class="dark-btn" id="host-random-room-btn" style="background:var(--yellow);color:#252525;border-color:var(--yellow);width:100%;font-size:12px;">
                ${icon('plus', 14)} Host Random Room
              </button>
            </div>
          </div>

          <button class="ghost-btn" data-view="dashboard" style="font-size:12px;">
            Back to Space
          </button>
        </article>
      </main>
    `;
  }

  const code = room.code;
  const isHost = state.userId === room.host_id;

  // 2. ROOM WAITING LOBBY
  if (room.status === 'waiting') {
    return `
      <main class="container view" style="padding-top:40px;padding-bottom:80px;max-width:780px;">
        <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:20px;">
          <!-- Left: Lobby details and Players -->
          <div>
            <article class="panel" style="padding:26px;">
              <div style="display:flex;justify-content:space-between;align-items:start;">
                <div>
                  <span class="tag" style="background:var(--yellow);font-weight:bold;margin-bottom:8px;">LOBBY ACTIVE</span>
                  <h1 style="font-size:26px;letter-spacing:-.04em;margin:8px 0 4px;">Waiting for players...</h1>
                  <p style="color:var(--muted);font-size:11px;margin:0;">Quiz: ${escapeHtml(quiz?.title || 'Loading...')}</p>
                </div>
                
                <div style="background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:8px 14px;text-align:center;">
                  <span style="font-size:9px;color:var(--muted);display:block;margin-bottom:2px;">ROOM CODE</span>
                  <strong style="font-family:monospace;font-size:22px;letter-spacing:1px;color:var(--ink);">${code}</strong>
                </div>
              </div>

              <!-- Joined Players list -->
              <h3 style="font-size:14px;margin:28px 0 10px 0;">Joined Players (${players.length})</h3>
              <div style="display:grid;gap:8px;margin-bottom:24px;">
                ${players.map(p => {
                  const name = p.profiles?.display_name || 'Player';
                  const lvl = p.profiles?.level || 1;
                  const isPlayerHost = p.user_id === room.host_id;
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--paper);border:1px solid var(--line);border-radius:8px;font-size:13px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div class="avatar" style="width:24px;height:24px;font-size:10px;background:var(--yellow);">${name.slice(0, 2).toUpperCase()}</div>
                        <span><strong>${escapeHtml(name)}</strong> (Lvl ${lvl})</span>
                      </div>
                      ${isPlayerHost ? `<span class="tag" style="background:#cbd7d1;font-size:9px;">HOST</span>` : `<span style="font-size:11px;color:var(--muted);">Ready</span>`}
                    </div>`;
                }).join('')}
              </div>

              <!-- Host actions -->
              <div style="display:flex;gap:10px;">
                ${isHost ? `
                  <button class="dark-btn" id="start-battle-btn" ${players.length < 2 ? 'disabled' : ''} style="background:var(--yellow);color:#252525;border-color:var(--yellow);font-size:12px;">
                    ${icon('sword', 14)} Start Battle
                  </button>
                ` : `
                  <p style="font-size:11px;color:var(--muted);font-style:italic;">Waiting for host to start the game...</p>
                `}
                <button class="ghost-btn" id="leave-room-btn" style="font-size:12px;">Leave Lobby</button>
              </div>
              ${isHost && players.length < 2 ? `<p style="font-size:10px;color:#a34f47;margin-top:6px;">Need at least 2 players to start a multiplayer battle.</p>` : ''}
            </article>
          </div>

          <!-- Right: Lobby chat room -->
          <div>
            <article class="panel" style="display:flex;flex-direction:column;height:380px;padding:20px;">
              <div class="panel-heading" style="margin-bottom:10px;">
                <h2>Room Chat</h2>
              </div>
              
              <div id="room-chat-messages" style="flex:1;overflow-y:auto;border:1px solid var(--line);border-radius:8px;padding:10px;background:var(--paper);margin-bottom:10px;display:flex;flex-direction:column;gap:6px;">
                ${messages.map(msg => `
                  <div style="font-size:11px;">
                    <strong>${escapeHtml(msg.username)}:</strong>
                    <span style="color:var(--muted);">${escapeHtml(msg.body)}</span>
                  </div>
                `).join('')}
              </div>

              <form id="room-chat-form" style="display:flex;gap:6px;">
                <input type="text" id="room-chat-input" placeholder="Chat here..." required autocomplete="off" style="flex:1;border:1px solid var(--line);border-radius:6px;padding:6px 10px;font-size:11px;background:var(--panel);color:var(--ink);outline:none;">
                <button class="dark-btn" type="submit" style="min-height:28px;padding:0 10px;font-size:11px;">Send</button>
              </form>
            </article>
          </div>
        </div>
      </main>
    `;
  }

  // 3. GAME PLAYING SCREEN
  if (room.status === 'playing') {
    const question = quiz?.questions?.[currentQuestionIdx];
    const totalQuestions = quiz?.questions?.length || 5;

    // Check if current user has submitted an answer for this question
    const myPlayerState = players.find(p => p.user_id === state.userId);
    const myAnswers = myPlayerState?.answers || [];
    const answeredThisQuestion = myAnswers[currentQuestionIdx] !== undefined;

    return `
      <main class="container view" style="padding-top:20px;padding-bottom:80px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div>
            <span class="tag" style="background:var(--yellow);font-weight:bold;">BATTLE ACTIVE</span>
            <span style="color:var(--muted);font-size:12px;margin-left:10px;">Code: ${code}</span>
          </div>
          
          <div style="font-size:12px;color:var(--muted);">
            Question ${currentQuestionIdx + 1} of ${totalQuestions}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1.3fr .7fr;gap:20px;">
          <!-- Left: Synchronized Active Question -->
          <div>
            <div class="panel question-card" style="margin-top:0;padding:26px;">
              ${question ? `
                <span class="eyebrow" style="color:rgba(255,255,255,0.7);">Question ${currentQuestionIdx + 1}</span>
                <h2 style="font-size:24px;line-height:1.2;margin:16px 0 24px;letter-spacing:-.05em;color:var(--paper);">${escapeHtml(question.prompt)}</h2>
                
                <div class="options">
                  ${(question.options || []).map((opt, idx) => {
                    const selected = answeredThisQuestion && myAnswers[currentQuestionIdx] === idx;
                    const correct = Number(question.answer) === idx;
                    let cls = '';
                    if (answeredThisQuestion) {
                      if (correct) cls = 'correct';
                      else if (selected) cls = 'wrong';
                    }
                    return `
                      <button class="option ${cls}" data-multiplayer-option-idx="${idx}" ${answeredThisQuestion ? 'disabled' : ''} style="width:100%;text-align:left;display:flex;align-items:center;margin-bottom:8px;">
                        <span style="font-weight:bold;margin-right:12px;background:rgba(255,255,255,.15);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;">
                          ${String.fromCharCode(65 + idx)}
                        </span>
                        <span>${escapeHtml(getOptionText(opt))}</span>
                      </button>`;
                  }).join('')}
                </div>
              ` : `<h2>Loading question...</h2>`}
              
              ${answeredThisQuestion && isHost && currentQuestionIdx < totalQuestions - 1 ? `
                <button class="dark-btn" id="next-multiplayer-btn" style="margin-top:20px;background:var(--yellow);color:#252525;border-color:var(--yellow);min-height:34px;font-size:12px;">
                  Next Question ${icon('arrow-right', 14)}
                </button>
              ` : ''}
              ${answeredThisQuestion && isHost && currentQuestionIdx === totalQuestions - 1 ? `
                <button class="dark-btn" id="finish-multiplayer-btn" style="margin-top:20px;background:var(--yellow);color:#252525;border-color:var(--yellow);min-height:34px;font-size:12px;">
                  End Battle & View Results
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Right: Live Scoreboard on the side -->
          <div>
            <article class="panel">
              <div class="panel-heading" style="margin-bottom:14px;">
                <h2>Live Standings</h2>
              </div>
              
              <div style="display:grid;gap:10px;">
                ${players.sort((a,b) => b.score - a.score).map((p, idx) => {
                  const name = p.profiles?.display_name || 'Player';
                  const hasAnswered = p.answers[currentQuestionIdx] !== undefined;
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--paper);border:1px solid var(--line);border-radius:8px;font-size:12px;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <strong>#${idx + 1}</strong>
                        <span>${escapeHtml(name)}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <strong>${p.score} pts</strong>
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${hasAnswered ? 'var(--mint)' : 'rgba(37,37,37,.15)'};" title="${hasAnswered ? 'Answered' : 'Thinking...'}"></span>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </article>
          </div>
        </div>
      </main>
    `;
  }

  // 4. GAME FINISHED / LEADERBOARD SUMMARY SCREEN
  if (room.status === 'finished') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winnerName = sorted[0]?.profiles?.display_name || 'Nobody';
    const isMeWinner = sorted[0]?.user_id === state.userId;

    return `
      <main class="container view" style="padding-top:40px;padding-bottom:80px;max-width:560px;">
        <article class="panel" style="padding:30px;text-align:center;background:linear-gradient(135deg, var(--panel), #fbf8eb);border-color:var(--yellow);">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--yellow);color:#252525;display:grid;place-items:center;margin:0 auto 16px;">
            ${icon('trophy', 32)}
          </div>
          <span class="eyebrow" style="margin:0 auto 10px;width:fit-content;">BATTLE CONCLUDED</span>
          <h1 style="font-size:32px;letter-spacing:-.06em;margin:10px 0 6px;">Battle Over!</h1>
          
          <div style="background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:20px;margin:24px 0 28px;">
            <span style="font-size:10px;color:var(--muted);text-transform:uppercase;">WINNER</span>
            <h2 style="font-size:24px;margin:6px 0 4px;color:var(--yellow);font-weight:bold;">${escapeHtml(winnerName)} 👑</h2>
            <p style="color:var(--muted);font-size:11px;margin:0 0 14px 0;">Completed with ${sorted[0]?.score} correct answers!</p>
            
            <h3 style="font-size:14px;border-top:1px solid var(--line);padding-top:14px;margin-bottom:10px;text-align:left;">Standings:</h3>
            <div style="display:grid;gap:8px;text-align:left;">
              ${sorted.map((p, idx) => `
                <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;">
                  <span><strong>#${idx + 1}</strong> ${escapeHtml(p.profiles?.display_name)}</span>
                  <strong>${p.score} points</strong>
                </div>`).join('')}
            </div>
          </div>

          <div style="display:flex;justify-content:center;gap:12px;">
            <button class="dark-btn" id="finish-battle-back-btn" style="font-size:12px;">
              Back to Discover
            </button>
            <button class="ghost-btn" data-view="dashboard" style="font-size:12px;">
              Go to Dashboard
            </button>
          </div>
        </article>
      </main>
    `;
  }

  return '';
}
