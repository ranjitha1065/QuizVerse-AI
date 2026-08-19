const STORAGE_KEY = 'quizverse-state';

const defaultState = {
  theme: 'light',
  activeView: 'discover',
  completedQuizzes: 0,
  streak: 0,
  xp: 0,
  level: 1,
  accuracy: 0,
  bookmarked: [],
  userCertificates: [],
  completedDaily: false,
  soundEnabled: false
};

export function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getSupabaseConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  };
}
