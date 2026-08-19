import { getSupabaseConfig } from './storage.js';
import { createClient } from '@supabase/supabase-js';
import { featuredQuizzes } from '../data.js';
import { ensure15Questions } from '../utils/quiz.js';

const { url, anonKey } = getSupabaseConfig();

export const supabaseEnabled = Boolean(url && anonKey);
export const supabase = supabaseEnabled ? createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: { params: { eventsPerSecond: 20 } }
}) : null;

// Helper to check if Supabase is connected
function requireClient() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase client is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
  }
}

// 1. Categories
export async function fetchCategories() {
  requireClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// 2. Quizzes
export async function fetchQuizzes(search = '', filters = {}) {
  requireClient();
  let query = supabase
    .from('quizzes')
    .select('*, profiles:creator_id(display_name), questions(count)')
    .eq('is_public', true)
    .eq('published', true);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
  }

  if (filters.category && filters.category !== 'All') {
    query = query.eq('category', filters.category);
  }

  if (filters.difficulty && filters.difficulty !== 'All') {
    query = query.eq('difficulty', filters.difficulty.toLowerCase());
  }

  // Sorting
  if (filters.sort === 'Popularity') {
    query = query.order('plays', { ascending: false });
  } else if (filters.sort === 'Highest Rated') {
    query = query.order('rating', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false }); // Newest
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter duration on client side since it is simple
  let results = data || [];
  if (filters.duration && filters.duration !== 'All') {
    if (filters.duration === 'Short (< 5 min)') {
      results = results.filter(q => q.estimated_minutes < 5);
    } else if (filters.duration === 'Medium (5-15 min)') {
      results = results.filter(q => q.estimated_minutes >= 5 && q.estimated_minutes <= 15);
    } else if (filters.duration === 'Long (> 15 min)') {
      results = results.filter(q => q.estimated_minutes > 15);
    }
  }

  return results;
}

export async function fetchQuiz(quizId) {
  if (!quizId) return null;
  requireClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);
  
  if (!isUuid) {
    // If quizId is a slug (e.g. 'design-quiet'), map it to seeded database title or fallback
    const titleMap = {
      'design-quiet': 'The quiet power of good design',
      'creative-code': 'Creative coding, decoded',
      'tiny-universe': 'A tiny universe inside your phone'
    };
    const mappedTitle = titleMap[quizId];
    if (mappedTitle) {
      const { data } = await supabase
        .from('quizzes')
        .select('*, profiles:creator_id(display_name), questions(*, options(*))')
        .ilike('title', mappedTitle)
        .maybeSingle();

      if (data) {
        if (data.questions) {
          data.questions.sort((a, b) => a.position - b.position);
          data.questions.forEach(q => {
            if (q.options) q.options.sort((a, b) => a.position - b.position);
          });
        }
        return ensure15Questions(data);
      }
    }

    const feat = (featuredQuizzes || []).find(q => q.id === quizId);
    if (feat) {
      return ensure15Questions({
        id: feat.id,
        title: feat.title,
        description: feat.description,
        category: feat.category,
        difficulty: (feat.difficulty || 'easy').toLowerCase(),
        estimated_minutes: 15,
        questions: []
      });
    }
    return null;
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select('*, profiles:creator_id(display_name), questions(*, options(*))')
    .eq('id', quizId)
    .single();
  
  if (error) throw error;
  
  if (data && data.questions) {
    data.questions = data.questions.sort((a, b) => a.position - b.position);
    data.questions.forEach(q => {
      if (q.options) {
        q.options = q.options.sort((a, b) => a.position - b.position);
      }
    });
  }
  
  return ensure15Questions(data);
}

export async function fetchRandomQuiz(excludedIds = [], difficulty = '') {
  requireClient();
  let query = supabase
    .from('quizzes')
    .select('id')
    .eq('is_public', true)
    .eq('published', true);
  
  if (difficulty) {
    query = query.eq('difficulty', difficulty.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const available = data.filter(quiz => !excludedIds.includes(quiz.id));
  const pool = available.length ? available : data;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return chosen ? fetchQuiz(chosen.id) : null;
}

// 3. User profiles & Leaderboard
export async function fetchProfile(userId) {
  if (!userId) return null;
  requireClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*, streaks(*)')
    .eq('id', userId)
    .single();

  if (data) {
    data.display_name = data.display_name || data.fullname || data.username || 'Learner';
    return data;
  }

  // Fallback if profile row is not created yet
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Learner';
      return {
        id: userId,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Learner',
        display_name: metaName,
        fullname: metaName,
        xp: 0,
        level: 1,
        coins: 0,
        streaks: { current_streak: 0, longest_streak: 0 }
      };
    }
  } catch (e) {
    console.warn('Fallback profile error:', e);
  }

  return null;
}

export async function fetchLeaderboard() {
  requireClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, xp, level')
    .order('xp', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

// 4. Attempts & Results
export async function fetchAttempt(userId) {
  if (!userId) return null;
  requireClient();
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(*)')
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function saveAttempt(attempt) {
  requireClient();
  const { data, error } = await supabase
    .from('quiz_attempts')
    .upsert(attempt)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitQuizResultRpc(attemptId, score, accuracy, timeTaken) {
  requireClient();
  const { data, error } = await supabase
    .rpc('complete_quiz_attempt', {
      attempt_id: attemptId,
      earned_score: score,
      earned_accuracy: accuracy,
      elapsed_seconds: timeTaken
    });
  if (error) throw error;
  return data;
}

// 5. Quiz Interactions (Likes, Comments, Reviews)
export async function fetchQuizReviews(quizId) {
  requireClient();
  const { data, error } = await supabase
    .from('quiz_reviews')
    .select('*, profiles(display_name, avatar_url)')
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function submitQuizReview(quizId, rating, body) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to leave a review.');

  const { data, error } = await supabase
    .from('quiz_reviews')
    .upsert({
      quiz_id: quizId,
      user_id: user.id,
      rating,
      body,
      created_at: new Date().toISOString()
    })
    .select();
  if (error) throw error;
  return data;
}

export async function fetchQuizComments(quizId) {
  requireClient();
  const { data, error } = await supabase
    .from('quiz_comments')
    .select('*, profiles(display_name, avatar_url)')
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addQuizComment(quizId, body) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to comment.');

  const { data, error } = await supabase
    .from('quiz_comments')
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      body
    })
    .select('*, profiles(display_name, avatar_url)')
    .single();
  if (error) throw error;
  return data;
}

export async function toggleQuizLike(quizId, liked) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to like a quiz.');

  if (liked) {
    const { error } = await supabase
      .from('quiz_likes')
      .insert({ quiz_id: quizId, user_id: user.id });
    if (error && error.code !== '23505') throw error; // ignore duplicate key
  } else {
    const { error } = await supabase
      .from('quiz_likes')
      .delete()
      .eq('quiz_id', quizId)
      .eq('user_id', user.id);
    if (error) throw error;
  }
}

export async function checkIfQuizLiked(quizId) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('quiz_likes')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .limit(1);
  if (error) return false;
  return data.length > 0;
}

// 6. Bookmarks
export async function toggleBookmark(quizId, questionId = null, bookmarked) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to save bookmarks.');

  if (bookmarked) {
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        question_id: questionId
      });
    if (error && error.code !== '23505') throw error;
  } else {
    let query = supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('quiz_id', quizId);
    
    if (questionId) {
      query = query.eq('question_id', questionId);
    }
    
    const { error } = await query;
    if (error) throw error;
  }
}

export async function fetchUserBookmarks(userId) {
  requireClient();
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*, quizzes(*), questions(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

// 7. Certificates
export async function fetchUserCertificates(userId) {
  requireClient();
  const { data, error } = await supabase
    .from('certificates')
    .select('*, quizzes(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function createCertificate(quizId) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Use upsert so re-taking a quiz won't fail with duplicate key error
  const { data, error } = await supabase
    .from('certificates')
    .upsert(
      {
        user_id: user.id,
        quiz_id: quizId,
        issued_at: new Date().toISOString(),
        certificate_url: ''
      },
      { onConflict: 'user_id,quiz_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error && !error.message?.includes('duplicate') && !error.message?.includes('unique')) {
    throw error;
  }
  return data;
}

// 8. Social, Chat & Activity
export async function fetchActivityFeed() {
  requireClient();
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function logActivity(type, metadata = {}) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_feed').insert({
    user_id: user.id,
    type,
    metadata
  });
}

export async function fetchFriends(userId) {
  requireClient();
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id,
      status,
      requester:profiles!friends_requester_id_fkey(id, display_name, avatar_url, xp, level),
      addressee:profiles!friends_addressee_id_fkey(id, display_name, avatar_url, xp, level)
    `)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  
  return (data || []).map(f => {
    const friendProfile = f.requester.id === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      status: f.status,
      ...friendProfile,
      isRequester: f.requester.id === userId
    };
  });
}

export async function sendFriendRequest(receiverUsername) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Login required.');

  // Find receiver display profile
  const { data: receiver, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', receiverUsername)
    .maybeSingle();
  
  if (findError || !receiver) throw new Error(`User "${receiverUsername}" not found.`);
  if (receiver.id === user.id) throw new Error('You cannot friend request yourself.');

  const { data, error } = await supabase
    .from('friends')
    .insert({
      requester_id: user.id,
      addressee_id: receiver.id,
      status: 'pending'
    })
    .select();
  
  if (error) {
    if (error.code === '23505') throw new Error('A friend request or link already exists.');
    throw error;
  }
  return data;
}

export async function acceptFriendRequest(friendshipId) {
  requireClient();
  const { data, error } = await supabase
    .from('friends')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .select();
  if (error) throw error;
  return data;
}

export async function declineFriendRequest(friendshipId) {
  requireClient();
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);
  if (error) throw error;
}

// 9. Challenges
export async function fetchChallenges() {
  requireClient();
  const today = new Date().toISOString().split('T')[0];
  
  const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
    supabase.from('daily_challenges').select('*, quizzes(*)').eq('challenge_date', today).maybeSingle(),
    supabase.from('weekly_challenges').select('*').order('week_start', { ascending: false }).limit(1),
    supabase.from('monthly_challenges').select('*').order('month_start', { ascending: false }).limit(1)
  ]);

  return {
    daily: dailyRes.data || null,
    weekly: weeklyRes.data?.[0] || null,
    monthly: monthlyRes.data?.[0] || null
  };
}

// 10. Admin Queries
export async function fetchAdminStats() {
  requireClient();
  const [usersCount, quizzesCount, playsSum] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }),
    supabase.from('quizzes').select('plays')
  ]);

  const totalPlays = (playsSum.data || []).reduce((acc, q) => acc + (q.plays || 0), 0);

  return {
    totalUsers: usersCount.count || 0,
    totalQuizzes: quizzesCount.count || 0,
    totalPlays
  };
}

export async function adminFetchUsers() {
  requireClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminUpdateUserRole(userId, isAdmin) {
  requireClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId);
  if (error) throw error;
}

export async function adminToggleBanUser(userId, isBanned) {
  requireClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: isBanned })
    .eq('id', userId);
  if (error) throw error;
}

export async function adminCreateCategory(category) {
  requireClient();
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateCategory(catId, category) {
  requireClient();
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', catId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminDeleteCategory(catId) {
  requireClient();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', catId);
  if (error) throw error;
}

export async function adminCreateQuizWithQuestions(quizData, questionsData) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Admin login required.');

  // Create quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      ...quizData,
      creator_id: user.id
    })
    .select()
    .single();

  if (quizError) throw quizError;

  // Insert questions and options
  for (const q of questionsData) {
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({
        quiz_id: quiz.id,
        prompt: q.prompt,
        answer: q.answer.toString(),
        explanation: q.explanation,
        hint: q.hint,
        points: q.points || 10,
        position: q.position || 0
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // Create options for this question
    const optionsInsert = q.options.map((optVal, idx) => ({
      question_id: question.id,
      label: String.fromCharCode(65 + idx),
      value: optVal,
      is_correct: idx.toString() === q.answer.toString(),
      position: idx
    }));

    const { error: optionsError } = await supabase
      .from('options')
      .insert(optionsInsert);

    if (optionsError) throw optionsError;
  }

  return quiz;
}

export async function adminDeleteQuiz(quizId) {
  requireClient();
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId);
  if (error) throw error;
}

// 11. Multiplayer Quiz Rooms
export async function createMultiplayerRoom(quizId) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from('quiz_rooms')
    .insert({
      code,
      quiz_id: quizId,
      host_id: user.id,
      status: 'waiting'
    })
    .select()
    .single();

  if (roomError) throw roomError;

  // Host joins as player
  const { error: playerError } = await supabase
    .from('quiz_room_players')
    .insert({
      room_id: room.id,
      user_id: user.id,
      score: 0,
      answers: []
    });

  if (playerError) throw playerError;
  return room;
}

export async function joinMultiplayerRoom(code) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data: room, error: roomError } = await supabase
    .from('quiz_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (roomError || !room) throw new Error('Quiz room code not found or closed.');
  if (room.status !== 'waiting') throw new Error('Game has already started in this room.');

  // Join player
  const { error: playerError } = await supabase
    .from('quiz_room_players')
    .upsert({
      room_id: room.id,
      user_id: user.id,
      score: 0,
      answers: []
    });

  if (playerError) throw playerError;
  return room;
}

export async function updateMultiplayerScore(roomId, score, answers, finished = false) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('quiz_room_players')
    .update({
      score,
      answers,
      finished
    })
    .eq('room_id', roomId)
    .eq('user_id', user.id);
  
  if (error) throw error;
}

export async function updateRoomStatus(roomId, status) {
  requireClient();
  const { error } = await supabase
    .from('quiz_rooms')
    .update({ status })
    .eq('id', roomId);
  if (error) throw error;
}

export async function updateRoomQuestion(roomId, index) {
  requireClient();
  const { error } = await supabase
    .from('quiz_rooms')
    .update({ current_question: index })
    .eq('id', roomId);
  if (error) throw error;
}

export async function sendChatMessage(roomId, body) {
  requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  // Fetch username
  const profile = await fetchProfile(user.id);
  const displayName = profile?.display_name || user.email.split('@')[0];

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId, // Null represents global chat
      user_id: user.id,
      username: displayName,
      body
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 12. Realtime Subscriptions
export function subscribeTo(table, callback) {
  if (!supabaseEnabled || !supabase) return () => {};
  const channel = supabase
    .channel(`quizverse-${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, payload => callback(payload));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToUserTable(table, userId, callback) {
  if (!supabaseEnabled || !supabase || !userId) return () => {};
  const channel = supabase
    .channel(`quizverse-${table}-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, payload => callback(payload));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToRoom(roomId, callback) {
  if (!supabaseEnabled || !supabase || !roomId) return () => {};
  const channel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_rooms', filter: `id=eq.${roomId}` }, payload => callback({ type: 'room', payload }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_room_players', filter: `room_id=eq.${roomId}` }, payload => callback({ type: 'player', payload }))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, payload => callback({ type: 'chat', payload }));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToGlobalChat(callback) {
  if (!supabaseEnabled || !supabase) return () => {};
  const channel = supabase
    .channel('global-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room_id=is.null' }, payload => callback(payload));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
