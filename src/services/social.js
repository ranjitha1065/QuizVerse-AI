import { 
  fetchFriends, 
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest,
  fetchActivityFeed,
  logActivity,
  sendChatMessage
} from './supabase.js';

export async function getFriendsList(userId) {
  try {
    return await fetchFriends(userId);
  } catch (error) {
    console.error("Failed to load friends list:", error);
    return [];
  }
}

export async function requestFriend(username) {
  try {
    const data = await sendFriendRequest(username);
    await logActivity('friend_request_sent', { recipient: username });
    return data;
  } catch (error) {
    throw new Error(error.message || 'Friend request failed.');
  }
}

export async function approveFriend(requestId, friendName) {
  try {
    const data = await acceptFriendRequest(requestId);
    await logActivity('friend_accepted', { friendName });
    return data;
  } catch (error) {
    throw new Error(error.message || 'Could not accept friend request.');
  }
}

export async function rejectFriend(requestId) {
  try {
    await declineFriendRequest(requestId);
  } catch (error) {
    throw new Error(error.message || 'Could not decline friend request.');
  }
}

export async function loadActivityLog() {
  try {
    return await fetchActivityFeed();
  } catch (error) {
    console.error("Failed to load activity feed:", error);
    return [];
  }
}

export async function publishGlobalMessage(body) {
  try {
    return await sendChatMessage(null, body); // null room_id means global chat
  } catch (error) {
    throw new Error(error.message || 'Could not send chat message.');
  }
}
