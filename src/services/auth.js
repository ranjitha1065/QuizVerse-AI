import { supabase, supabaseEnabled } from './supabase.js';

function requireSupabase() {
  if (!supabaseEnabled || !supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export async function signUp({ email, password, username, fullName, avatar, ...profile }) {
  requireSupabase();
  const displayName = fullName || username || email.split('@')[0];
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || email.split('@')[0],
        full_name: displayName,
        display_name: displayName,
        ...profile
      }
    }
  });
  if (error) throw error;

  if (data.user) {
    // Explicitly guarantee profiles database row exists with registered display_name
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username || email.split('@')[0],
        display_name: displayName,
        fullname: displayName,
        country: profile.country || null,
        bio: profile.bio || null,
        learning_goal: profile.learningGoal || null,
        experience_level: profile.experienceLevel || 'intermediate'
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('Profile upsert warning:', err);
    }

    if (avatar) await uploadAvatar(data.user.id, avatar);
  }
  return data;
}

export async function signIn({ email, password }) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithUsername({ username, password, rememberMe = true }) {
  requireSupabase();
  const { data: email, error: lookupError } = await supabase.rpc('get_auth_email_by_username', { requested_username: username });
  if (lookupError || !email) throw new Error('Username or password is incorrect.');
  const { data: user, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!rememberMe) sessionStorage.setItem('quizverse-session', 'temporary');
  return user;
}

export async function signInWithProvider(provider) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  requireSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#reset-password` });
  if (error) throw error;
}

export async function updatePassword(password) {
  requireSupabase();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  if (!supabaseEnabled || !supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function uploadAvatar(userId, file) {
  requireSupabase();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const { error: profileError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
  if (profileError) throw profileError;
  return data.publicUrl;
}
