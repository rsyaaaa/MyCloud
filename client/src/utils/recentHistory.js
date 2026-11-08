// Utility for managing recently accessed files, documents, photos, videos, and folders with strict User-ID isolation

const RECENT_KEY_PREFIX = 'mycloud_recent_history_';
const MAX_RECENT_ITEMS = 30;

function resolveUserId(explicitUserId) {
  if (explicitUserId) return explicitUserId;
  try {
    const token = localStorage.getItem('mycloud_auth_token');
    if (token) {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const decoded = JSON.parse(atob(payloadBase64));
        if (decoded && decoded.id) return decoded.id;
      }
    }
  } catch (e) {}
  return 'anonymous';
}

function getUserStorageKey(userId) {
  // Always clean up the old legacy unisolated key if present so it never leaks across accounts
  try {
    if (localStorage.getItem('mycloud_recent_history')) {
      localStorage.removeItem('mycloud_recent_history');
    }
  } catch (e) {}

  const uid = resolveUserId(userId);
  return `${RECENT_KEY_PREFIX}${uid}`;
}

export function getRecentHistory(userId) {
  try {
    const key = getUserStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const resolvedUid = resolveUserId(userId);
    return Array.isArray(parsed)
      ? parsed.filter((item) => !item.user_id || item.user_id === resolvedUid)
      : [];
  } catch (e) {
    console.error('Failed to parse recent history:', e);
    return [];
  }
}

export function recordRecentItem(item, userId) {
  if (!item || (!item.id && !item.folder_id)) return;
  try {
    const resolvedUid = resolveUserId(userId || item.user_id);
    const key = getUserStorageKey(resolvedUid);
    const history = getRecentHistory(resolvedUid);
    const itemId = item.id || `folder_${item.folder_id}`;

    // Filter out existing item
    const filtered = history.filter((i) => {
      const existingId = i.id || `folder_${i.folder_id}`;
      return existingId !== itemId;
    });

    const newItem = {
      ...item,
      id: item.id || null,
      user_id: item.user_id || resolvedUid,
      folder_id: item.folder_id || null,
      name: item.displayName || item.display_name || item.name || item.original_name || 'Item',
      type: item.is_folder ? 'folder' : (item.media_type || 'file'),
      opened_at: new Date().toISOString()
    };

    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to record recent item:', e);
  }
}

export function clearRecentHistory(userId) {
  try {
    const key = getUserStorageKey(userId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear recent history:', e);
  }
}
