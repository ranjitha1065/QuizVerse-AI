import './styles/main.css';
import { categories as fallbackCategories, featuredQuizzes as fallbackQuizzes } from './data.js';
import { loadState, saveState } from './services/storage.js';
import { icon, refreshIcons } from './utils/icons.js';
import { getCorrectOptionIndex, ensure15Questions } from './utils/quiz.js';

// Import services
import { getSession, onAuthStateChange, sendPasswordReset, signIn, signInWithUsername, signOut, signUp, updatePassword } from './services/auth.js';
import { 
  supabase,
  supabaseEnabled,
  fetchCategories,
  fetchQuizzes,
  fetchQuiz,
  fetchRandomQuiz,
  fetchLeaderboard,
  fetchProfile,
  fetchAttempt,
  saveAttempt,
  submitQuizResultRpc,
  toggleQuizLike,
  checkIfQuizLiked,
  toggleBookmark,
  fetchUserBookmarks,
  fetchUserCertificates,
  createCertificate,
  fetchActivityFeed,
  logActivity,
  fetchFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  fetchChallenges,
  fetchAdminStats,
  adminFetchUsers,
  adminUpdateUserRole,
  adminToggleBanUser,
  adminCreateCategory,
  adminDeleteCategory,
  adminCreateQuizWithQuestions,
  adminDeleteQuiz,
  createMultiplayerRoom,
  joinMultiplayerRoom,
  updateMultiplayerScore,
  updateRoomStatus,
  updateRoomQuestion,
  sendChatMessage,
  subscribeTo,
  subscribeToUserTable,
  subscribeToRoom,
  subscribeToGlobalChat
} from './services/supabase.js';

import { generateQuizFromAI, generateStudyNotes, generateAIFeedback } from './services/ai.js';

// Import Views
import { renderDiscover } from './views/discover.js';
import { renderDashboard } from './views/dashboard.js';
import { renderQuiz } from './views/quiz.js';
import { renderResults } from './views/results.js';
import { renderMultiplayer } from './views/multiplayer.js';
import { renderAdmin } from './views/admin.js';

// DOM Shell
const app = document.querySelector('#app');

// State Initialization
let state = loadState();
// Default additional states
if (!state.discoverFilters) {
  state.discoverFilters = { category: 'All', difficulty: 'All', duration: 'All', sort: 'Newest' };
}
if (!state.discoverSearch) state.discoverSearch = '';
if (!state.bookmarked) state.bookmarked = [];
if (!state.dashboardTab) state.dashboardTab = 'overview';

// Live content variables
let session = null;
let liveProfile = null;
let liveCategories = fallbackCategories;
let liveQuizzes = fallbackQuizzes.map(q => ({
  ...q,
  questions: q.questions,
  time: q.time,
  plays: q.plays || 120,
  likes: q.likes || 48,
  rating: q.rating || 4.7,
  creator: 'System'
}));
let liveLeaderboard = [];
let liveActivityLog = [];
let liveChallenges = null;
let liveActiveAttempts = [];
let userBookmarks = [];
let userCertificates = [];
let userFriends = [];

// --- Local certificate helpers (Supabase-independent fallback) ---
function getLocalCertificates() {
  try { return JSON.parse(localStorage.getItem('quizverse-certs') || '[]'); } catch { return []; }
}
function saveLocalCertificate(cert) {
  const certs = getLocalCertificates();
  const exists = certs.some(c => c.quiz_id === cert.quiz_id && c.user_id === cert.user_id);
  if (!exists) {
    certs.push(cert);
    localStorage.setItem('quizverse-certs', JSON.stringify(certs));
  } else {
    // Update existing entry with latest date / accuracy
    const idx = certs.findIndex(c => c.quiz_id === cert.quiz_id && c.user_id === cert.user_id);
    if (idx !== -1) { certs[idx] = { ...certs[idx], ...cert }; }
    localStorage.setItem('quizverse-certs', JSON.stringify(certs));
  }
}
function mergeLocalAndRemoteCerts(remote = []) {
  const local = getLocalCertificates();
  const merged = [...remote];
  local.forEach(lc => {
    if (!merged.some(rc => rc.quiz_id === lc.quiz_id)) merged.push(lc);
  });
  return merged;
}

// --- Confetti particle burst logic ---
function triggerConfetti() {
  let canvas = document.querySelector('#confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#f3c969', '#c3d9ef', '#b8d9c2', '#f8cfbd', '#d4a017', '#e27b66'];
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -100 - 20,
    r: Math.random() * 6 + 4,
    d: Math.random() * 20 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 5,
    tiltAngleIncremental: Math.random() * 0.07 + 0.02,
    tiltAngle: 0
  }));

  let animationId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - (p.r / 3)) * 12;

      if (p.y < canvas.height) {
        active = true;
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      }
    });

    if (active) {
      animationId = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  
  draw();
  setTimeout(() => {
    cancelAnimationFrame(animationId);
    canvas.remove();
  }, 4000);
}

// Auth Mode state
let authMode = 'signin';
let loginMode = 'email';
let authStep = 1;

// Quiz Session state
let activeQuiz = null;
let activeQuizIndex = 0;
let activeQuizAnswers = [];
let activeQuizSelectedIndex = null;
let activeQuizAnswered = false;
let activeQuizShowHint = false;
let activeQuizPaused = false;
let activeQuizTimer = null;
let activeQuizSeconds = 300; // 5 min default

// Multiplayer state
let mpRoom = null;
let mpPlayers = [];
let mpMessages = [];
let mpRoomSubscription = null;
let mpChatSubscription = null;
let globalChatMessages = [];

// Speech synthesis object
let utterance = null;

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

// Normalize quiz helper
const normalizeQuiz = quiz => ({
  ...quiz,
  questions: quiz.total_questions || (quiz.questions ? quiz.questions.length : 0) || 5,
  time: `${quiz.estimated_minutes || 5} min`,
  plays: quiz.plays || 0,
  likes: quiz.likes || 0,
  rating: quiz.rating || 0.0,
  creator: quiz.profiles?.display_name || 'Community'
});

let globalLoading = false;

// Toast notification helper
function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function showAuthError(message) {
  const error = document.querySelector('#auth-error');
  if (error) error.textContent = message;
}

// ----------------------------------------------------
// DATA SYNCHRONIZATION
// ----------------------------------------------------
async function refreshGlobalData() {
  if (!supabaseEnabled) return;
  globalLoading = true;
  try {
    const [cats, qzs, challengeRes] = await Promise.all([
      fetchCategories(),
      fetchQuizzes(state.discoverSearch, state.discoverFilters),
      fetchChallenges()
    ]);
    if (cats && cats.length > 0) liveCategories = cats;
    if (qzs) liveQuizzes = qzs.map(normalizeQuiz);
    if (challengeRes) liveChallenges = challengeRes;
    
    // Fetch global leaderboard and activity feed
    const [lbl, actFeed] = await Promise.all([
      fetchLeaderboard(),
      fetchActivityFeed()
    ]);
    if (lbl) liveLeaderboard = lbl;
    if (actFeed) liveActivityLog = actFeed;
  } catch (error) {
    console.warn('Global data fetch error:', error);
  } finally {
    globalLoading = false;
  }
}

async function refreshUserProfileData() {
  if (!supabaseEnabled || !state.userId) return;
  try {
    const [profile, bookmarks, certs, friends, attempts] = await Promise.all([
      fetchProfile(state.userId),
      fetchUserBookmarks(state.userId),
      fetchUserCertificates(state.userId),
      fetchFriends(state.userId),
      fetchAttempt(state.userId) // incomplete attempts
    ]);
    if (profile) {
      liveProfile = {
        ...profile,
        display_name: profile.display_name || profile.fullname || profile.username || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || state.user?.fullName || 'Learner'
      };
      state.xp = profile.xp;
      state.level = profile.level;
      state.streak = profile.streaks?.current_streak || 0;
      saveState(state);
    } else if (session?.user) {
      const fallbackName = session.user.user_metadata?.full_name || session.user.user_metadata?.username || session.user.email?.split('@')[0] || state.user?.fullName || 'Learner';
      liveProfile = {
        id: session.user.id,
        display_name: fallbackName,
        fullname: fallbackName,
        username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Learner',
        xp: state.xp || 0,
        level: state.level || 1,
        coins: 0
      };
    }
    if (bookmarks) {
      userBookmarks = bookmarks;
      state.bookmarked = bookmarks.filter(b => b.quiz_id && !b.question_id).map(b => b.quiz_id);
      saveState(state);
    }
    userCertificates = mergeLocalAndRemoteCerts(certs || []);
    if (friends) userFriends = friends;
    if (attempts) {
      liveActiveAttempts = [attempts]; // wrap in array
    } else {
      liveActiveAttempts = [];
    }
  } catch (error) {
    console.warn('Profile data fetch error:', error);
  }
}

// ----------------------------------------------------
// UI RENDERING
// ----------------------------------------------------
function header() {
  return `
    <header class="topbar container">
      <a class="brand" href="#" data-view="discover"><span class="brand-mark">${icon('sparkles', 16)}</span>QuizVerse <span class="serif">AI</span></a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a class="${state.activeView === 'discover' ? 'active' : ''}" href="#discover" data-view="discover">Discover</a>
        <a class="${state.activeView === 'dashboard' ? 'active' : ''}" href="#dashboard" data-view="dashboard">My space</a>
        <a class="${state.activeView === 'multiplayer' ? 'active' : ''}" href="#multiplayer" data-view="multiplayer">Arena</a>
        <a href="#categories">Categories</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">${icon(state.theme === 'dark' ? 'sun' : 'moon', 16)}</button>
        ${session ? `<button class="ghost-btn" data-action="logout">Log out</button>` : '<button class="ghost-btn" data-action="open-auth">Log in</button>'}
        <button class="dark-btn" data-view="dashboard">Start learning ${icon('arrow-up-right', 15)}</button>
      </div>
    </header>
  `;
}

function authDialog() {
  const profileCategories = liveCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  
  const stepIndicator = authMode === 'signup' ? `
    <div class="auth-steps">
      <div class="auth-step-dot ${authStep >= 1 ? 'done' : ''} ${authStep === 1 ? 'active' : ''}"></div>
      <div class="auth-step-dot ${authStep >= 2 ? 'done' : ''} ${authStep === 2 ? 'active' : ''}"></div>
      <div class="auth-step-dot ${authStep >= 3 ? 'done' : ''} ${authStep === 3 ? 'active' : ''}"></div>
      <span style="font-size:10px;color:var(--muted);margin-left:6px;font-family:monospace;">Step ${authStep} of 3</span>
    </div>
  ` : '';

  return `
    <dialog class="auth-dialog" id="auth-dialog">
      <button class="icon-btn auth-close" data-action="close-auth" aria-label="Close">${icon('x', 16)}</button>
      <span class="eyebrow">${authMode === 'signup' ? 'Create your space' : 'Welcome back'}</span>
      <h2>${authMode === 'signup' ? 'Start learning in public.' : 'Pick up where you left off.'}</h2>
      
      ${stepIndicator}

      <form id="auth-form">
        <div class="auth-fields">
          ${authMode === 'signup' ? `
            <!-- STEP 1: Credentials -->
            <div class="auth-step-pane" style="display: ${authStep === 1 ? 'grid' : 'none'}; gap: 12px;">
              <label>Email *<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
              <label>Password *<input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="Min. 8 characters"></label>
              <label>Confirm password *<input name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Confirm your password"></label>
            </div>

            <!-- STEP 2: Identity -->
            <div class="auth-step-pane" style="display: ${authStep === 2 ? 'grid' : 'none'}; gap: 12px;">
              <label>Username *<input name="username" ${authStep === 2 ? 'required' : ''} minlength="3" autocomplete="username" placeholder="johndoe"></label>
              <label>Full name *<input name="fullName" ${authStep === 2 ? 'required' : ''} autocomplete="name" placeholder="John Doe"></label>
              <label>Country<input name="country" autocomplete="country-name" placeholder="United States"></label>
              <label>Bio<textarea name="bio" rows="2" placeholder="Tell us about yourself..."></textarea></label>
            </div>

            <!-- STEP 3: Preferences & Customization -->
            <div class="auth-step-pane" style="display: ${authStep === 3 ? 'grid' : 'none'}; gap: 12px;">
              <label>Avatar file<input name="avatar" type="file" accept="image/*"></label>
              <label>Favorite Category
                <select name="favoriteCategory">
                  <option value="">Select Category</option>
                  ${profileCategories}
                </select>
              </label>
              <label>Learning Goal<input name="learningGoal" placeholder="E.g. Learn React, master art..."></label>
              <label>Experience Level
                <select name="experienceLevel">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate" selected>Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
            </div>
          ` : `
            <!-- Login simple fields -->
            <label>Email *<input name="email" type="email" required autocomplete="email"></label>
            <label>Password *<input name="password" type="password" required minlength="8" autocomplete="current-password"></label>
            <label class="remember-field"><input name="rememberMe" type="checkbox" checked> Remember me</label>
          `}
        </div>
        
        <div style="display:flex;gap:10px;margin-top:14px;">
          ${authMode === 'signup' && authStep > 1 ? `
            <button class="ghost-btn" type="button" id="auth-prev-step-btn" style="flex:1;">
              Back
            </button>
          ` : ''}
          
          <button class="dark-btn" type="submit" id="auth-submit-btn" style="flex:2;">
            ${authMode === 'signup' ? (authStep === 3 ? 'Create account' : 'Next Step') : 'Log in'} ${icon('arrow-right', 15)}
          </button>
        </div>
      </form>

      <!-- SOCIAL AUTH -->
      ${authStep === 1 || authMode === 'signin' ? `
        <div style="margin:18px 0;text-align:center;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;">
          Or sign in with
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="ghost-btn" id="google-login-btn" style="flex:1;font-size:12px;min-height:34px;">${icon('chrome', 14)} Google</button>
          <button class="ghost-btn" id="github-login-btn" style="flex:1;font-size:12px;min-height:34px;">${icon('github', 14)} GitHub</button>
        </div>
      ` : ''}

      <button class="text-btn" data-action="toggle-auth">${authMode === 'signup' ? 'Already have an account? Log in' : 'Create an account'}</button>
      <button class="text-btn" data-action="forgot-password">Forgot password?</button>
      <p class="auth-error" id="auth-error" role="alert"></p>
    </dialog>
  `;
}

function passwordResetDialog() {
  return `
    <dialog class="auth-dialog" id="reset-password-dialog" open>
      <span class="eyebrow">SECURITY Check</span>
      <h2>Reset your password</h2>
      <form id="reset-password-form" style="display:grid;gap:12px;">
        <label>
          New Password
          <input type="password" id="reset-new-password" required minlength="8" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 12px;color:var(--ink);background:var(--panel);outline:none;">
        </label>
        <button class="dark-btn" type="submit" style="margin-top:10px;">Update Password ${icon('lock', 14)}</button>
      </form>
      <p class="auth-error" id="reset-error" role="alert"></p>
    </dialog>
  `;
}

function render() {
  // Check if reset password token is in hash
  const hash = window.location.hash;
  const isResetMode = hash === '#reset-password' || hash.includes('type=recovery');

  let viewHtml = '';
  if (isResetMode) {
    viewHtml = passwordResetDialog();
  } else if (state.activeView === 'dashboard') {
    viewHtml = renderDashboard(state, liveProfile, userBookmarks, liveLeaderboard, liveActivityLog, userCertificates, userFriends, globalChatMessages, liveCategories);
  } else if (state.activeView === 'quiz') {
    const isBookmarked = state.bookmarked?.includes(activeQuiz?.id);
    viewHtml = renderQuiz(activeQuiz, activeQuizIndex, activeQuizAnswers, activeQuizSelectedIndex, activeQuizAnswered, activeQuizShowHint, activeQuizPaused, activeQuizSeconds, isBookmarked);
  } else if (state.activeView === 'results') {
    viewHtml = renderResults(activeQuiz, state, liveProfile);
  } else if (state.activeView === 'multiplayer') {
    viewHtml = renderMultiplayer(state, mpRoom, mpPlayers, activeQuiz, activeQuizIndex, mpMessages);
  } else if (state.activeView === 'admin') {
    // Analytics stats
    const stats = {
      totalUsers: liveLeaderboard.length || 0,
      totalQuizzes: liveQuizzes.length || 0,
      totalPlays: liveQuizzes.reduce((sum, q) => sum + q.plays, 0)
    };
    viewHtml = renderAdmin(state, stats, liveLeaderboard, liveCategories, liveQuizzes);
  } else {
    viewHtml = renderDiscover(state, liveCategories, liveQuizzes, liveLeaderboard, liveActivityLog, liveChallenges, liveActiveAttempts, liveProfile, globalLoading);
  }

  // Floating quiz button is only visible if not in quiz and not in multiplayer game
  const showFloatingQuizMe = state.activeView !== 'quiz' && (state.activeView !== 'multiplayer' || !mpRoom || mpRoom.status !== 'playing');
  const floatingQuizMeHtml = showFloatingQuizMe ? `<button class="floating-quiz-me dark-btn" data-action="quiz-me" aria-label="Start a random quiz">${icon('dice-5', 18)} Quiz Me</button>` : '';

  app.innerHTML = `
    <div class="app-shell" data-theme="${state.theme}">
      ${header()}
      ${viewHtml}
      ${floatingQuizMeHtml}
      <footer class="footer container">
        <span>© 2026 QuizVerse AI</span>
        <span>Live learning, everywhere.</span>
      </footer>
      <div class="toast" id="toast" role="status"></div>
      ${authDialog()}
    </div>
  `;

  refreshIcons();
  bindEvents();
}

// ----------------------------------------------------
// EVENT LISTENERS BINDING
// ----------------------------------------------------
function bindEvents() {
  // Navigation
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', event => {
    event.preventDefault();
    const targetView = btn.dataset.view;

    // Route protections
    if ((targetView === 'dashboard' || targetView === 'multiplayer' || targetView === 'admin') && !session) {
      showToast('Login required to access this area.');
      document.querySelector('#auth-dialog')?.showModal();
      return;
    }

    state.activeView = targetView;
    saveState(state);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  // Theme Toggler
  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    saveState(state);
    render();
  });

  // Auth Dialog Controls
  document.querySelector('[data-action="open-auth"]')?.addEventListener('click', () => {
    authMode = 'signin';
    authStep = 1;
    render();
    document.querySelector('#auth-dialog')?.showModal();
  });
  document.querySelector('[data-action="close-auth"]')?.addEventListener('click', () => {
    authStep = 1;
    document.querySelector('#auth-dialog')?.close();
  });
  document.querySelector('[data-action="toggle-auth"]')?.addEventListener('click', () => {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    authStep = 1;
    render();
    document.querySelector('#auth-dialog')?.showModal();
  });
  document.querySelector('[data-action="forgot-password"]')?.addEventListener('click', async () => {
    const email = window.prompt('Enter your email for password reset:');
    if (!email) return;
    try {
      await sendPasswordReset(email);
      showToast('Password reset link sent to your inbox.');
    } catch (e) {
      showToast(e.message);
    }
  });

  // OAuth buttons
  document.querySelector('#google-login-btn')?.addEventListener('click', async () => {
    try {
      await signInWithProvider('google');
    } catch (e) {
      showToast(e.message);
    }
  });
  document.querySelector('#github-login-btn')?.addEventListener('click', async () => {
    try {
      await signInWithProvider('github');
    } catch (e) {
      showToast(e.message);
    }
  });
  // Auth Form Submit
  document.querySelector('#auth-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const email = form.get('email');
    const password = form.get('password');

    // Multi-step Registration Navigation
    if (authMode === 'signup') {
      if (authStep === 1) {
        const confirmPassword = form.get('confirmPassword');
        if (password !== confirmPassword) {
          showAuthError('Passwords do not match.');
          return;
        }
        if (password.length < 8) {
          showAuthError('Password must be at least 8 characters.');
          return;
        }
        authStep = 2;
        render();
        document.querySelector('#auth-dialog')?.showModal();
        return;
      }
      if (authStep === 2) {
        const username = form.get('username');
        const fullName = form.get('fullName');
        if (!username || username.length < 3) {
          showAuthError('Username must be at least 3 characters.');
          return;
        }
        if (!fullName) {
          showAuthError('Full name is required.');
          return;
        }
        authStep = 3;
        render();
        document.querySelector('#auth-dialog')?.showModal();
        return;
      }
    }

    // Actually register or log in (Step 3 or Sign In)
    try {
      if (authMode === 'signup') {
        const username = form.get('username');
        const fullName = form.get('fullName');
        const avatar = form.get('avatar');
        const country = form.get('country');
        const bio = form.get('bio');
        const favoriteCategory = form.get('favoriteCategory');
        const learningGoal = form.get('learningGoal');
        const experienceLevel = form.get('experienceLevel');

        await signUp({
          email,
          password,
          username,
          fullName,
          avatar,
          country,
          bio,
          favoriteCategory,
          learningGoal,
          experienceLevel
        });
        
        const registeredDisplayName = fullName || username || email.split('@')[0];
        state.user = { fullName: registeredDisplayName, username: username || registeredDisplayName, email };
        saveState(state);
        liveProfile = {
          display_name: registeredDisplayName,
          fullname: registeredDisplayName,
          username: username || registeredDisplayName,
          xp: state.xp || 0,
          level: state.level || 1,
          coins: 0
        };

        showToast(`Welcome ${registeredDisplayName}! Account registered.`);
        authStep = 1;
        document.querySelector('#auth-dialog')?.close();
        render();
      } else {
        const res = await signIn({ email, password });
        if (res?.user) {
          const userMetaName = res.user.user_metadata?.full_name || res.user.user_metadata?.username || email.split('@')[0];
          state.user = { fullName: userMetaName, username: res.user.user_metadata?.username || email.split('@')[0], email };
          saveState(state);
          liveProfile = {
            id: res.user.id,
            display_name: userMetaName,
            fullname: userMetaName,
            username: res.user.user_metadata?.username || email.split('@')[0],
            xp: state.xp || 0,
            level: state.level || 1,
            coins: 0
          };
        }
        showToast('Welcome back to QuizVerse!');
        document.querySelector('#auth-dialog')?.close();
        render();
      }
    } catch (e) {
      showAuthError(e.message);
    }
  });

  // Previous Auth Step Button
  document.querySelector('#auth-prev-step-btn')?.addEventListener('click', () => {
    if (authStep > 1) {
      authStep--;
      render();
      document.querySelector('#auth-dialog')?.showModal();
    }
  });;

  // Password reset submit
  document.querySelector('#reset-password-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const newPass = document.querySelector('#reset-new-password')?.value;
    try {
      await updatePassword(newPass);
      showToast('Password updated successfully. Redirecting...');
      window.location.hash = '#discover';
      state.activeView = 'discover';
      saveState(state);
      render();
    } catch (e) {
      const err = document.querySelector('#reset-error');
      if (err) err.textContent = e.message;
    }
  });

  // Log out
  document.querySelector('[data-action="logout"]')?.addEventListener('click', async () => {
    try {
      await signOut();
      session = null;
      liveProfile = null;
      state.userId = null;
      state.activeView = 'discover';
      saveState(state);
      showToast('Logged out successfully.');
      render();
    } catch (e) {
      showToast(e.message);
    }
  });

  // Personalized Hero quick triggers
  document.querySelector('#hero-quick-play-btn')?.addEventListener('click', () => {
    const dailyCard = document.querySelector('.daily-challenge-card');
    if (dailyCard) {
      dailyCard.click();
    } else {
      showToast("Starting today's top featured quiz!");
      const firstQuizCard = document.querySelector('[data-quiz-id]');
      if (firstQuizCard) firstQuizCard.click();
    }
  });

  document.querySelector('#hero-quiz-me-btn')?.addEventListener('click', () => {
    const floatingBtn = document.querySelector('[data-action="quiz-me"]');
    if (floatingBtn) floatingBtn.click();
  });

  const searchInput = document.querySelector('#search-input');
  if (searchInput) {
    // Realtime search debouncer
    let searchDebounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(async () => {
        state.discoverSearch = searchInput.value;
        saveState(state);
        await refreshGlobalData();
        render();
        // keep focus in input
        document.querySelector('#search-input')?.focus();
      }, 350);
    });
  }

  // Filter dropdown listeners
  ['filter-category', 'filter-difficulty', 'filter-duration', 'filter-sort'].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener('change', async event => {
      const field = id.replace('filter-', '');
      state.discoverFilters[field] = event.target.value;
      saveState(state);
      await refreshGlobalData();
      render();
    });
  });

  // Category cards clicks (sets category filter and scrolls to list)
  document.querySelectorAll('[data-category]').forEach(card => card.addEventListener('click', async () => {
    const cat = card.dataset.category;
    state.discoverFilters.category = cat;
    saveState(state);
    await refreshGlobalData();
    render();
    document.querySelector('#featured')?.scrollIntoView({ behavior: 'smooth' });
  }));

  // Toggle bookmark in cards
  document.querySelectorAll('[data-action="toggle-bookmark"]').forEach(btn => btn.addEventListener('click', async event => {
    event.stopPropagation();
    if (!session) {
      showToast('Login required to bookmark quizzes.');
      document.querySelector('#auth-dialog')?.showModal();
      return;
    }
    const id = btn.dataset.id;
    const isBookmarked = state.bookmarked.includes(id);
    try {
      await toggleBookmark(id, null, !isBookmarked);
      showToast(isBookmarked ? 'Bookmark removed.' : 'Quiz bookmarked.');
      await refreshUserProfileData();
      render();
    } catch (e) {
      showToast(e.message);
    }
  }));

  // Clicking on a quiz card starts the quiz player
  document.querySelectorAll('[data-quiz-id]').forEach(card => card.addEventListener('click', async () => {
    const quizId = card.dataset.quizId;
    if (!quizId) return;
    
    // Check if within active multiplayer game
    if (state.activeView === 'multiplayer' && mpRoom && mpRoom.status === 'playing') return;

    try {
      const qz = await fetchQuiz(quizId);
      if (!qz || !qz.questions || qz.questions.length === 0) {
        throw new Error('This quiz has no questions published yet.');
      }
      
      // Initialize Quiz Session state
      activeQuiz = qz;
      activeQuizIndex = 0;
      activeQuizAnswers = Array(qz.questions.length).fill(null);
      activeQuizSelectedIndex = null;
      activeQuizAnswered = false;
      activeQuizShowHint = false;
      activeQuizPaused = false;
      activeQuizSeconds = (qz.estimated_minutes || 5) * 60;

      // Start Quiz Timer
      clearInterval(activeQuizTimer);
      activeQuizTimer = setInterval(() => {
        if (!activeQuizPaused) {
          activeQuizSeconds--;
          if (activeQuizSeconds <= 0) {
            clearInterval(activeQuizTimer);
            showToast('Time expired! Submitting your answers.');
            finishQuizSession();
          } else {
            // Re-render only the timer text for performance
            const min = Math.floor(activeQuizSeconds / 60);
            const sec = activeQuizSeconds % 60;
            const text = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            const timeEl = document.querySelector('#pause-toggle-btn + span');
            if (timeEl) timeEl.textContent = text;
          }
        }
      }, 1000);

      // Create new quiz attempt in Supabase
      if (session) {
        try {
          const attempt = await saveAttempt({
            user_id: state.userId,
            quiz_id: quizId,
            current_question: 0,
            answers: []
          });
          state.currentAttemptId = attempt.id;
          saveState(state);
        } catch (e) {
          console.warn('Could not save attempt to remote database:', e);
        }
      }

      state.activeView = 'quiz';
      saveState(state);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      showToast(e.message);
    }
  }));

  // Resume active attempts
  document.querySelectorAll('[data-resume-attempt]').forEach(btn => btn.addEventListener('click', async event => {
    event.stopPropagation();
    const attemptId = btn.dataset.resumeAttempt;
    try {
      const attempt = liveActiveAttempts.find(a => a.id === attemptId);
      if (!attempt) return;
      const qz = await fetchQuiz(attempt.quiz_id);
      
      activeQuiz = qz;
      activeQuizIndex = attempt.current_question || 0;
      activeQuizAnswers = Array(qz.questions.length).fill(null);
      // Map stored answers
      if (attempt.answers) {
        attempt.answers.forEach((ans, idx) => {
          activeQuizAnswers[idx] = ans.selected_index;
        });
      }
      activeQuizSelectedIndex = null;
      activeQuizAnswered = false;
      activeQuizShowHint = false;
      activeQuizPaused = false;
      activeQuizSeconds = (qz.estimated_minutes || 5) * 60;
      state.currentAttemptId = attemptId;
      
      // Start Timer
      clearInterval(activeQuizTimer);
      activeQuizTimer = setInterval(() => {
        if (!activeQuizPaused) {
          activeQuizSeconds--;
          if (activeQuizSeconds <= 0) {
            clearInterval(activeQuizTimer);
            finishQuizSession();
          }
        }
      }, 1000);

      state.activeView = 'quiz';
      saveState(state);
      render();
    } catch (e) {
      showToast(e.message);
    }
  }));

  // ----------------------------------------------------
  // ACTIVE QUIZ INTERACTIVE RUNTIME
  // ----------------------------------------------------
  if (state.activeView === 'quiz' && activeQuiz) {
    // Option Click
    document.querySelectorAll('[data-option-idx]').forEach(btn => btn.addEventListener('click', async () => {
      if (activeQuizAnswered) return;
      
      const idx = Number(btn.dataset.optionIdx || btn.getAttribute('data-option-idx'));
      activeQuizSelectedIndex = idx;
      activeQuizAnswered = true;
      activeQuizAnswers[activeQuizIndex] = idx;

      // TTS voice reading stop
      if (window.speechSynthesis) window.speechSynthesis.cancel();

      // Update quiz attempt to database (Auto Save!)
      if (session && state.currentAttemptId) {
        try {
          const currentAnswers = [...activeQuizAnswers];
          const dbAnswers = currentAnswers.map((sel, qIdx) => ({
            question_id: activeQuiz.questions[qIdx]?.id,
            selected_index: sel,
            correct: sel !== null ? sel === Number(activeQuiz.questions[qIdx]?.answer) : null
          })).filter(a => a.selected_index !== null);

          await saveAttempt({
            id: state.currentAttemptId,
            user_id: state.userId,
            quiz_id: activeQuiz.id,
            current_question: activeQuizIndex,
            answers: dbAnswers
          });
        } catch (e) {
          console.warn('Auto save attempt failed:', e);
        }
      }

      // Check if selected answer is correct to trigger confetti burst
      const q = activeQuiz.questions[activeQuizIndex];
      const correctIdx = getCorrectOptionIndex(q);
      if (idx === correctIdx) {
        triggerConfetti();
      }

      render();
    }));

    // Toggle Pause/Resume
    document.querySelector('#pause-toggle-btn')?.addEventListener('click', () => {
      activeQuizPaused = !activeQuizPaused;
      render();
    });
    document.querySelector('#resume-quiz-btn')?.addEventListener('click', () => {
      activeQuizPaused = false;
      render();
    });

    // TTS speaker read aloud
    document.querySelector('#tts-speak-btn')?.addEventListener('click', () => {
      if (!window.speechSynthesis) {
        showToast('Voice reading is not supported by your browser.');
        return;
      }
      
      // Toggle speaking
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        showToast('Voice paused.');
        return;
      }

      const q = activeQuiz.questions[activeQuizIndex];
      const optsText = (q.options || []).map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o.value || o}`).join(', ');
      const speechText = `${q.prompt}. ${optsText}`;
      
      utterance = new SpeechSynthesisUtterance(speechText);
      window.speechSynthesis.speak(utterance);
      showToast('Reading question aloud...');
    });

    // Hint toggle
    document.querySelector('#hint-toggle-btn')?.addEventListener('click', () => {
      activeQuizShowHint = !activeQuizShowHint;
      render();
    });

    // Fullscreen mode toggle
    document.querySelector('#fullscreen-toggle-btn')?.addEventListener('click', () => {
      const container = document.querySelector('.app-shell');
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          showToast(`Fullscreen failed: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });

    // Question bookmarks toggling
    document.querySelector('#quiz-bookmark-btn')?.addEventListener('click', async () => {
      if (!session) {
        showToast('Login required to bookmark questions.');
        return;
      }
      const q = activeQuiz.questions[activeQuizIndex];
      const isBookmarked = state.bookmarked.includes(activeQuiz.id);
      try {
        await toggleBookmark(activeQuiz.id, q.id, !isBookmarked);
        showToast(isBookmarked ? 'Question bookmark removed.' : 'Question bookmarked!');
        await refreshUserProfileData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    });

    // Jump question selector
    document.querySelectorAll('[data-jump-question]').forEach(btn => btn.addEventListener('click', () => {
      activeQuizIndex = Number(btn.dataset.jumpQuestion);
      activeQuizSelectedIndex = activeQuizAnswers[activeQuizIndex];
      activeQuizAnswered = activeQuizSelectedIndex !== null;
      activeQuizShowHint = false;
      render();
    }));

    // Next/Finish question
    document.querySelector('#next-question-btn')?.addEventListener('click', () => {
      if (activeQuizIndex < activeQuiz.questions.length - 1) {
        activeQuizIndex++;
        activeQuizSelectedIndex = activeQuizAnswers[activeQuizIndex];
        activeQuizAnswered = activeQuizSelectedIndex !== null;
        activeQuizShowHint = false;
        render();
      } else {
        finishQuizSession();
      }
    });
  }

  // ----------------------------------------------------
  // SHARED CERTIFICATE GENERATOR
  // ----------------------------------------------------
  function generateAndDownloadCertificate({ username, quizTitle, accuracy, score, total, issueDate }) {
    const uname = username || 'Learner';
    const acc = accuracy || '';
    const issDate = issueDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 820;
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, 1200, 820);
    grd.addColorStop(0, '#fdf6e3'); grd.addColorStop(1, '#fffde7');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 1200, 820);

    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 14;
    ctx.strokeRect(22, 22, 1156, 776);
    ctx.strokeStyle = '#c8960c'; ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, 1124, 744);

    ctx.fillStyle = '#b8860b'; ctx.font = 'bold 16px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('QUIZVERSE AI  •  VERIFIED CERTIFICATE OF ACHIEVEMENT', 600, 90);

    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(100, 108); ctx.lineTo(1100, 108); ctx.stroke();

    ctx.fillStyle = '#252525'; ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('Certificate of Achievement', 600, 190);

    ctx.fillStyle = '#888'; ctx.font = '22px Arial, sans-serif';
    ctx.fillText('This is to certify that', 600, 250);

    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold italic 58px Georgia, serif';
    ctx.fillText(uname, 600, 330);

    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(300, 358); ctx.lineTo(900, 358); ctx.stroke();

    ctx.fillStyle = '#555'; ctx.font = '22px Arial, sans-serif';
    ctx.fillText('has successfully completed the quiz with excellence:', 600, 405);

    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(quizTitle, 600, 460);

    ctx.font = 'bold 20px Arial, sans-serif'; ctx.fillStyle = '#555';
    if (acc !== '') {
      ctx.textAlign = 'left'; ctx.fillText(`Score: ${score}/${total}`, 280, 540);
      ctx.textAlign = 'center'; ctx.fillText(`Accuracy: ${acc}%`, 600, 540);
      ctx.textAlign = 'right'; ctx.fillText(`Date: ${issDate}`, 920, 540);
    } else {
      ctx.textAlign = 'center'; ctx.fillText(`Date: ${issDate}`, 600, 540);
    }
    ctx.textAlign = 'center';

    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(100, 600); ctx.lineTo(1100, 600); ctx.stroke();

    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(230, 700); ctx.lineTo(530, 700); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(670, 700); ctx.lineTo(970, 700); ctx.stroke();

    ctx.fillStyle = '#888'; ctx.font = '14px Arial, sans-serif';
    ctx.fillText('QuizVerse AI Director', 380, 725);
    ctx.fillText('Program Coordinator', 820, 725);

    ctx.fillStyle = '#b8860b'; ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('OFFICIAL · VERIFIED · QUIZVERSE AI', 600, 770);

    const link = document.createElement('a');
    link.download = `QuizVerse_Certificate_${uname.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // ----------------------------------------------------
  // RESULTS VIEW HANDLERS
  // ----------------------------------------------------
  if (state.activeView === 'results') {
    document.querySelector('#results-retry-btn')?.addEventListener('click', () => {
      // simulate click on card to reinitialize
      const quizId = activeQuiz?.id;
      if (!quizId) return;
      const fakeCard = document.createElement('div');
      fakeCard.dataset.quizId = quizId;
      document.body.appendChild(fakeCard);
      // triggers the card click listener
      fakeCard.click();
      fakeCard.remove();
    });

    document.querySelector('#results-share-btn')?.addEventListener('click', btn => {
      const title = btn.target.dataset.title || btn.target.closest('button').dataset.title;
      const score = btn.target.dataset.score || btn.target.closest('button').dataset.score;
      const text = `I completed the "${title}" quiz on QuizVerse with ${score}% accuracy! Join me and build your learning habit!`;
      
      navigator.clipboard.writeText(text).then(() => {
        showToast('Results copied to clipboard!');
      }).catch(() => {
        showToast('Clipboard copy failed.');
      });
    });

    document.querySelector('#print-cert-btn')?.addEventListener('click', () => {
      window.print();
    });

    document.querySelector('#download-cert-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      generateAndDownloadCertificate({
        username: btn.dataset.username || 'Learner',
        quizTitle: btn.dataset.quiz || 'Quiz',
        accuracy: btn.dataset.accuracy || '',
        score: btn.dataset.score || '',
        total: btn.dataset.total || '',
        issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      });
    });
  } // end results view handlers

  // ----------------------------------------------------
  // USER DASHBOARD VIEW HANDLERS
  // ----------------------------------------------------
  if (state.activeView === 'dashboard') {
    // Sidebar Tabs navigation
    document.querySelectorAll('.side-nav button').forEach(btn => btn.addEventListener('click', () => {
      state.dashboardTab = btn.dataset.tab;
      saveState(state);
      render();
    }));

    // Certificate Download buttons (dashboard)
    document.querySelectorAll('.cert-download-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const b = e.currentTarget;
      generateAndDownloadCertificate({
        username: b.dataset.certUsername || 'Learner',
        quizTitle: b.dataset.certQuiz || 'Quiz',
        accuracy: b.dataset.certAccuracy || '',
        score: b.dataset.certScore || '',
        total: b.dataset.certTotal || '',
        issueDate: b.dataset.certDate || new Date().toLocaleDateString()
      });
    }));

    // Global chat message send
    document.querySelector('#chat-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const input = document.querySelector('#chat-input');
      const body = input?.value;
      if (!body) return;

      try {
        await sendChatMessage(null, body);
        input.value = '';
      } catch (e) {
        showToast(e.message);
      }
    });

    // Add friend by username
    document.querySelector('#add-friend-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const usernameInput = document.querySelector('#friend-username');
      const friendUsername = usernameInput?.value;
      if (!friendUsername) return;

      try {
        await sendFriendRequest(friendUsername);
        showToast(`Friend request sent to @${friendUsername}`);
        usernameInput.value = '';
        await refreshUserProfileData();
        render();
      } catch (e) {
        const err = document.querySelector('#friend-error');
        if (err) err.textContent = e.message;
      }
    });

    // Accept friend requests
    document.querySelectorAll('[data-action="accept-friend"]').forEach(btn => btn.addEventListener('click', async () => {
      const reqId = btn.dataset.id;
      const name = btn.dataset.name;
      try {
        await acceptFriendRequest(reqId);
        showToast(`You are now friends with ${name}!`);
        await logActivity('friend_accepted', { friendName: name });
        await refreshUserProfileData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Decline friend requests
    document.querySelectorAll('[data-action="decline-friend"]').forEach(btn => btn.addEventListener('click', async () => {
      const reqId = btn.dataset.id;
      try {
        await declineFriendRequest(reqId);
        showToast('Friend request declined.');
        await refreshUserProfileData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Multiplayer battle button inside friends list
    document.querySelectorAll('[data-action="challenge-friend"]').forEach(btn => btn.addEventListener('click', async () => {
      const friendId = btn.dataset.id;
      const friendName = btn.dataset.name;
      try {
        // Find random published quiz id
        const chosenQuiz = liveQuizzes[0];
        if (!chosenQuiz) throw new Error('Host failed: No published quizzes available yet.');

        mpRoom = await createMultiplayerRoom(chosenQuiz.id);
        state.activeView = 'multiplayer';
        saveState(state);
        showToast(`Created battle room code: ${mpRoom.code}`);
        
        // Setup realtime sync
        setupMultiplayerSubscriptions(mpRoom.id);
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Remove bookmark
    document.querySelectorAll('[data-action="remove-bookmark"]').forEach(btn => btn.addEventListener('click', async event => {
      event.stopPropagation();
      const id = btn.dataset.id;
      const quizId = btn.dataset.quizId || id;
      const questionId = btn.dataset.quizId ? id : null;
      try {
        await toggleBookmark(quizId, questionId, false);
        showToast('Saved item removed.');
        await refreshUserProfileData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // AI Quiz Generator submit
    document.querySelector('#ai-generator-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const topic = document.querySelector('#ai-topic')?.value;
      const diff = document.querySelector('#ai-difficulty')?.value;
      const count = Number(document.querySelector('#ai-count')?.value || 5);
      
      try {
        showToast('AI is generating questions...');
        const generated = await generateQuizFromAI(topic, diff, count);
        
        // Bind generated content to Active Quiz
        activeQuiz = {
          id: 'ai-generated-' + Date.now(),
          title: generated.title,
          description: generated.description,
          category: generated.category,
          difficulty: generated.difficulty,
          estimated_minutes: Math.ceil(generated.questions.length * 0.8),
          questions: generated.questions.map((q, i) => ({
            id: `ai-q-${i}`,
            prompt: q.prompt,
            answer: q.answer.toString(),
            explanation: q.explanation,
            hint: q.hint,
            points: 20,
            options: q.options.map((opt, oIdx) => ({
              id: `ai-o-${i}-${oIdx}`,
              value: opt,
              label: String.fromCharCode(65 + oIdx)
            }))
          }))
        };

        // Initialize quiz taking session states
        activeQuizIndex = 0;
        activeQuizAnswers = Array(activeQuiz.questions.length).fill(null);
        activeQuizSelectedIndex = null;
        activeQuizAnswered = false;
        activeQuizShowHint = false;
        activeQuizPaused = false;
        activeQuizSeconds = activeQuiz.estimated_minutes * 60;

        // Start timer
        clearInterval(activeQuizTimer);
        activeQuizTimer = setInterval(() => {
          if (!activeQuizPaused) {
            activeQuizSeconds--;
            if (activeQuizSeconds <= 0) {
              clearInterval(activeQuizTimer);
              finishQuizSession();
            }
          }
        }, 1000);

        state.activeView = 'quiz';
        saveState(state);
        render();
      } catch (e) {
        showToast(e.message);
      }
    });

    // AI Study notes submit
    document.querySelector('#generate-notes-btn')?.addEventListener('click', async () => {
      const topicInput = document.querySelector('#ai-notes-topic');
      const topic = topicInput?.value;
      if (!topic) return;

      const outputEl = document.querySelector('#ai-notes-output');
      if (outputEl) outputEl.innerHTML = '<div style="color:var(--muted);text-align:center;margin-top:60px;">AI is compiling study notes...</div>';

      try {
        const notes = await generateStudyNotes(topic);
        if (outputEl) {
          outputEl.innerHTML = `
            <div style="font-family:sans-serif;font-size:12px;color:var(--ink);">
              ${notes.replace(/\n/g, '<br>')}
            </div>`;
        }
      } catch (e) {
        if (outputEl) outputEl.textContent = 'Notes generation failed.';
        showToast(e.message);
      }
    });
  }

  // ----------------------------------------------------
  // MULTIPLAYER VIEW LOBBY EVENTS
  // ----------------------------------------------------
  if (state.activeView === 'multiplayer') {
    // Join room form submit
    document.querySelector('#join-room-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const codeInput = document.querySelector('#join-code-input');
      const code = codeInput?.value;
      if (!code) return;

      try {
        mpRoom = await joinMultiplayerRoom(code);
        showToast(`Joined multiplayer battle code: ${code}`);
        setupMultiplayerSubscriptions(mpRoom.id);
        
        // Fetch quiz details
        activeQuiz = await fetchQuiz(mpRoom.quiz_id);
        render();
      } catch (e) {
        showToast(e.message);
      }
    });

    // Host random battle room
    document.querySelector('#host-random-room-btn')?.addEventListener('click', async () => {
      try {
        const chosen = liveQuizzes[0];
        if (!chosen) throw new Error('Lobby failed: No quizzes published yet.');
        
        mpRoom = await createMultiplayerRoom(chosen.id);
        setupMultiplayerSubscriptions(mpRoom.id);
        
        activeQuiz = await fetchQuiz(chosen.id);
        render();
      } catch (e) {
        showToast(e.message);
      }
    });

    // Leave multiplayer room
    document.querySelector('#leave-room-btn')?.addEventListener('click', () => {
      if (mpRoomSubscription) mpRoomSubscription();
      if (mpChatSubscription) mpChatSubscription();
      mpRoom = null;
      mpPlayers = [];
      mpMessages = [];
      render();
    });

    // Room Chat message send
    document.querySelector('#room-chat-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const input = document.querySelector('#room-chat-input');
      const body = input?.value;
      if (!body || !mpRoom) return;

      try {
        await sendChatMessage(mpRoom.id, body);
        input.value = '';
      } catch (e) {
        showToast(e.message);
      }
    });

    // Start battle match (Host only)
    document.querySelector('#start-battle-btn')?.addEventListener('click', async () => {
      if (!mpRoom || !isHost) return;
      try {
        await updateRoomStatus(mpRoom.id, 'playing');
        await updateRoomQuestion(mpRoom.id, 0);
      } catch (e) {
        showToast(e.message);
      }
    });

    // Synchronized multiplayer answer option click
    document.querySelectorAll('[data-multiplayer-option-idx]').forEach(btn => btn.addEventListener('click', async () => {
      const myPlayer = mpPlayers.find(p => p.user_id === state.userId);
      const myAnswers = myPlayer?.answers || [];
      if (myAnswers[activeQuizIndex] !== undefined) return;

      const selection = Number(btn.dataset.multiplayerOptionIdx || btn.getAttribute('data-multiplayer-option-idx'));
      const q = activeQuiz.questions[activeQuizIndex];
      const isCorrect = selection === Number(q.answer);
      
      const newAnswers = [...myAnswers];
      newAnswers[activeQuizIndex] = selection;
      const scoreIncrement = isCorrect ? 10 : 0;
      const newScore = (myPlayer?.score || 0) + scoreIncrement;

      try {
        await updateMultiplayerScore(mpRoom.id, newScore, newAnswers, false);
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Next synchronized question (Host only)
    document.querySelector('#next-multiplayer-btn')?.addEventListener('click', async () => {
      if (!isHost || !mpRoom) return;
      try {
        const nextIdx = activeQuizIndex + 1;
        await updateRoomQuestion(mpRoom.id, nextIdx);
      } catch (e) {
        showToast(e.message);
      }
    });

    // End battle & View results (Host only)
    document.querySelector('#finish-multiplayer-btn')?.addEventListener('click', async () => {
      if (!isHost || !mpRoom) return;
      try {
        // Mark all players as finished
        const myPlayer = mpPlayers.find(p => p.user_id === state.userId);
        await updateMultiplayerScore(mpRoom.id, myPlayer?.score || 0, myPlayer?.answers || [], true);
        await updateRoomStatus(mpRoom.id, 'finished');
      } catch (e) {
        showToast(e.message);
      }
    });

    // Back from battle concluded
    document.querySelector('#finish-battle-back-btn')?.addEventListener('click', () => {
      if (mpRoomSubscription) mpRoomSubscription();
      if (mpChatSubscription) mpChatSubscription();
      mpRoom = null;
      mpPlayers = [];
      mpMessages = [];
      state.activeView = 'discover';
      saveState(state);
      render();
    });
  }

  // ----------------------------------------------------
  // ADMIN PANEL CONTROLS
  // ----------------------------------------------------
  if (state.activeView === 'admin') {
    // Admin tab click
    document.querySelectorAll('[data-admin-tab]').forEach(btn => btn.addEventListener('click', () => {
      state.adminTab = btn.dataset.adminTab;
      saveState(state);
      render();
    }));

    // CSV Exporter (Users)
    document.querySelector('#export-users-csv')?.addEventListener('click', () => {
      if (liveLeaderboard.length === 0) return;
      const headers = ['User ID', 'Username', 'Display Name', 'XP', 'Level'];
      const rows = liveLeaderboard.map(u => [u.id, u.username || '', u.display_name, u.xp, u.level]);
      downloadCsv('users_export.csv', headers, rows);
    });

    // CSV Exporter (Quizzes)
    document.querySelector('#export-quizzes-csv')?.addEventListener('click', () => {
      if (liveQuizzes.length === 0) return;
      const headers = ['Quiz ID', 'Title', 'Category', 'Difficulty', 'Plays', 'Likes', 'Rating'];
      const rows = liveQuizzes.map(q => [q.id, q.title, q.category, q.difficulty, q.plays, q.likes, q.rating]);
      downloadCsv('quizzes_export.csv', headers, rows);
    });

    // Toggle User admin role
    document.querySelectorAll('[data-action="toggle-user-role"]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const isAdmin = btn.dataset.admin === 'true';
      try {
        await adminUpdateUserRole(id, !isAdmin);
        showToast('User role updated successfully.');
        await refreshGlobalData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Toggle User Ban
    document.querySelectorAll('[data-action="toggle-user-ban"]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const isBanned = btn.dataset.banned === 'true';
      try {
        await adminToggleBanUser(id, !isBanned);
        showToast(isBanned ? 'User unbanned.' : 'User banned from platform.');
        await refreshGlobalData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Create custom Category submit
    document.querySelector('#admin-create-category-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const name = document.querySelector('#cat-name')?.value;
      const description = document.querySelector('#cat-desc')?.value;
      const color = document.querySelector('#cat-color')?.value;
      const iconVal = document.querySelector('#cat-icon')?.value || 'tag';

      try {
        await adminCreateCategory({ name, description, color, icon: iconVal });
        showToast(`Category "${name}" created!`);
        await refreshGlobalData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    });

    // Create custom Quiz submit
    document.querySelector('#admin-create-quiz-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const title = document.querySelector('#new-quiz-title')?.value;
      const description = document.querySelector('#new-quiz-desc')?.value;
      const categoryId = document.querySelector('#new-quiz-cat')?.value;
      const difficulty = document.querySelector('#new-quiz-diff')?.value;
      const estMin = Number(document.querySelector('#new-quiz-time')?.value || 5);
      const color = document.querySelector('#new-quiz-color')?.value;

      // Extract single question details
      const prompt = document.querySelector('#q1-prompt')?.value;
      const opt0 = document.querySelector('#q1-opt0')?.value;
      const opt1 = document.querySelector('#q1-opt1')?.value;
      const opt2 = document.querySelector('#q1-opt2')?.value;
      const opt3 = document.querySelector('#q1-opt3')?.value;
      const hint = document.querySelector('#q1-hint')?.value;
      const explanation = document.querySelector('#q1-exp')?.value;

      const categoryObj = liveCategories.find(c => c.id === categoryId);

      const quizData = {
        title,
        description,
        category_id: categoryId,
        category: categoryObj?.name || 'General',
        difficulty,
        estimated_minutes: estMin,
        color,
        icon: categoryObj?.icon || 'sparkles',
        is_public: true,
        published: true
      };

      const questionsData = [{
        prompt,
        options: [opt0, opt1, opt2, opt3],
        answer: 0, // Option A is correct
        hint,
        explanation,
        points: 10,
        position: 0
      }];

      try {
        await adminCreateQuizWithQuestions(quizData, questionsData);
        showToast(`Quiz "${title}" published successfully!`);
        await refreshGlobalData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    });

    // Delete Quiz
    document.querySelectorAll('[data-action="delete-quiz"]').forEach(btn => btn.addEventListener('click', async () => {
      const qzId = btn.dataset.id;
      if (!confirm("Are you sure you want to delete this quiz? This action is permanent.")) return;
      try {
        await adminDeleteQuiz(qzId);
        showToast('Quiz deleted.');
        await refreshGlobalData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));

    // Delete Category
    document.querySelectorAll('[data-action="delete-category"]').forEach(btn => btn.addEventListener('click', async () => {
      const catId = btn.dataset.id;
      if (!confirm("Delete this category?")) return;
      try {
        await adminDeleteCategory(catId);
        showToast('Category deleted.');
        await refreshGlobalData();
        render();
      } catch (e) {
        showToast(e.message);
      }
    }));
  }

  // ----------------------------------------------------
  // GENERAL FLOATING ACTIONS
  // ----------------------------------------------------
  document.querySelectorAll('[data-action="quiz-me"]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      showToast('Finding a fresh quiz for you...');
      const quiz = await fetchRandomQuiz([], '');
      if (!quiz) throw new Error('No published quizzes are available yet.');
      
      activeQuiz = quiz;
      activeQuizIndex = 0;
      activeQuizAnswers = Array(quiz.questions.length).fill(null);
      activeQuizSelectedIndex = null;
      activeQuizAnswered = false;
      activeQuizShowHint = false;
      activeQuizPaused = false;
      activeQuizSeconds = (quiz.estimated_minutes || 5) * 60;

      // Start Timer
      clearInterval(activeQuizTimer);
      activeQuizTimer = setInterval(() => {
        if (!activeQuizPaused) {
          activeQuizSeconds--;
          if (activeQuizSeconds <= 0) {
            clearInterval(activeQuizTimer);
            finishQuizSession();
          }
        }
      }, 1000);

      state.activeView = 'quiz';
      saveState(state);
      render();
    } catch (e) {
      showToast(e.message);
    }
  }));
}

// ----------------------------------------------------
// MULTIPLAYER REALTIME SYNC CONTROLLERS
// ----------------------------------------------------
function setupMultiplayerSubscriptions(roomId) {
  if (mpRoomSubscription) mpRoomSubscription();
  
  mpRoomSubscription = subscribeToRoom(roomId, async event => {
    if (event.type === 'room') {
      const payload = event.payload;
      if (payload.eventType === 'UPDATE') {
        mpRoom = payload.new;
        activeQuizIndex = mpRoom.current_question || 0;
        
        // Force state route updates if room state goes playing/finished
        if (payload.new.status === 'playing') {
          activeQuizIndex = payload.new.current_question || 0;
          activeQuizAnswered = false;
          activeQuizSelectedIndex = null;
        }
        
        render();
      } else if (payload.eventType === 'DELETE') {
        showToast('The battle room has been closed.');
        mpRoom = null;
        render();
      }
    } else if (event.type === 'player') {
      // Re-fetch players list
      const { data, error } = await supabase
        .from('quiz_room_players')
        .select('*, profiles(id, display_name, avatar_url, level)')
        .eq('room_id', roomId);
      
      if (!error && data) {
        mpPlayers = data;
        render();
      }
    } else if (event.type === 'chat') {
      mpMessages.push(event.payload.new);
      render();
      
      // Scroll chat to bottom
      const chatEl = document.querySelector('#room-chat-messages');
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }
  });

  // Fetch initial players and messages
  supabase.from('quiz_room_players')
    .select('*, profiles(id, display_name, avatar_url, level)')
    .eq('room_id', roomId)
    .then(({ data }) => {
      if (data) {
        mpPlayers = data;
        render();
      }
    });

  supabase.from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .then(({ data }) => {
      if (data) {
        mpMessages = data;
        render();
      }
    });
}

// ----------------------------------------------------
// FINISH QUIZ LOGIC
// ----------------------------------------------------
async function finishQuizSession() {
  clearInterval(activeQuizTimer);
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  let correctCount = 0;
  const breakdown = [];

  if (activeQuiz && activeQuiz.questions) {
    activeQuiz.questions.forEach((q, idx) => {
      const correctIdx = getCorrectOptionIndex(q);
      const userSelected = activeQuizAnswers[idx];
      const isCorrect = userSelected === correctIdx;
      if (isCorrect) correctCount++;

      breakdown.push({
        prompt: q.prompt,
        userAnswer: userSelected,
        correctAnswer: correctIdx,
        isCorrect,
        options: q.options,
        explanation: q.explanation
      });
    });
  }

  const totalQuestions = activeQuiz?.questions?.length || 15;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const score = correctCount; // score is total correct questions out of 15
  const timeTaken = ((activeQuiz?.estimated_minutes || 15) * 60) - activeQuizSeconds;

  const xpEarned = score * 10;
  const coinsEarned = score * 2;

  // Compile final results state
  state.lastResult = {
    score,
    totalQuestions,
    accuracy,
    timeTaken: timeTaken > 0 ? timeTaken : 12,
    xp: xpEarned,
    coins: coinsEarned,
    breakdown
  };

  // Submit result to Supabase
  if (session) {
    try {
      showToast('Submitting results to profile...');
      
      // Update attempts Rpc
      if (state.currentAttemptId) {
        await submitQuizResultRpc(state.currentAttemptId, score, accuracy, timeTaken);
      }

      // Log activity completion
      await logActivity('quiz_completed', { 
        quizId: activeQuiz.id, 
        quizTitle: activeQuiz.title,
        accuracy 
      });

      // Earn certificate if score >= 70% (passing grade)
      if (accuracy >= 70) {
        // Always save locally first (works offline / without DB table)
        const localCert = {
          user_id: state.userId || session?.user?.id || 'local',
          quiz_id: activeQuiz.id,
          quiz_title: activeQuiz.title,
          accuracy,
          score,
          total_questions: totalQuestions,
          issued_at: new Date().toISOString(),
          quizzes: { title: activeQuiz.title, category: activeQuiz.category }
        };
        saveLocalCertificate(localCert);
        userCertificates = mergeLocalAndRemoteCerts(userCertificates);

        try {
          await createCertificate(activeQuiz.id);
        } catch (certErr) {
          if (!certErr.message?.includes('duplicate') && !certErr.message?.includes('unique')) {
            console.warn('Certificate issue error:', certErr);
          }
        }

        if (accuracy === 100) {
          showToast('👑 Perfect score! Verified Certificate issued.');
        } else {
          showToast('🎓 Well done! Your Certificate has been issued.');
        }
      }

      await refreshUserProfileData();
      await refreshGlobalData();
    } catch (e) {
      console.warn('Could not sync completion to database:', e);
    }
  }

  state.activeView = 'results';
  saveState(state);
  render();
}

// ----------------------------------------------------
// CSV HELPER
// ----------------------------------------------------
function downloadCsv(filename, headers, rows) {
  const escapeCsv = val => '"' + String(val ?? '').replace(/"/g, '""') + '"';
  
  const headerRow = headers.map(escapeCsv).join(',');
  const dataRows = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const csvContent = `${headerRow}\n${dataRows}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------------------------------
// BOOTSTRAP INITIALIZATION
// ----------------------------------------------------
async function init() {
  // Load local certificates immediately (before any async calls)
  userCertificates = mergeLocalAndRemoteCerts([]);
  render();
  
  // Try restoring auth session
  try {
    session = await getSession();
    state.userId = session?.user?.id || null;
    saveState(state);
    
    // Set up Realtime subscriptions if user is logged in
    if (session) {
      subscribeToGlobalMessages();
      subscribeToUserProfileChanges();
    }
  } catch (e) {
    console.warn('Session restore failed:', e);
  }

  // Load Categories & Quizzes
  await refreshGlobalData();
  await refreshUserProfileData();
  render();

  // Keyboard Shortcuts for Quiz Player
  window.addEventListener('keydown', (e) => {
    if (state.activeView === 'quiz' && activeQuiz) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const q = activeQuiz.questions[activeQuizIndex];
      if (!q) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (q.options && q.options[idx] && !activeQuizAnswered) {
          activeQuizSelectedIndex = idx;
          activeQuizAnswered = true;
          activeQuizAnswers[activeQuizIndex] = idx;
          render();
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        const nextBtn = document.querySelector('#next-question-btn');
        if (nextBtn) nextBtn.click();
      } else if (e.key === 'Escape') {
        activeQuizPaused = !activeQuizPaused;
        render();
      } else if (e.key.toLowerCase() === 'v') {
        document.querySelector('#tts-speak-btn')?.click();
      }
    }
  });

  // Listen to auth changes
  onAuthStateChange(async currSession => {
    session = currSession;
    state.userId = currSession?.user?.id || null;
    saveState(state);
    
    if (currSession) {
      subscribeToGlobalMessages();
      subscribeToUserProfileChanges();
      await refreshUserProfileData();
      await refreshGlobalData();
    }
    render();
  });

  // Subscribe to real-time triggers for categories and quizzes
  subscribeTo('categories', async () => {
    await refreshGlobalData();
    render();
  });
  subscribeTo('quizzes', async () => {
    await refreshGlobalData();
    render();
  });
}

function subscribeToGlobalMessages() {
  if (mpChatSubscription) mpChatSubscription();
  
  // Fetch initial global messages
  supabase.from('messages')
    .select('*')
    .is('room_id', null)
    .order('created_at', { ascending: true })
    .then(({ data }) => {
      if (data) {
        globalChatMessages = data;
        render();
      }
    });

  mpChatSubscription = subscribeToGlobalChat(payload => {
    globalChatMessages.push(payload.new);
    render();
    
    // Scroll chat element
    const chatEl = document.querySelector('#chat-messages');
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
  });
}

function subscribeToUserProfileChanges() {
  if (!state.userId) return;
  // Subscribe to profiles changes to sync real-time XP, level, coins
  subscribeToUserTable('profiles', state.userId, () => {
    refreshUserProfileData().then(() => render());
  });
}

// Run app
init();
