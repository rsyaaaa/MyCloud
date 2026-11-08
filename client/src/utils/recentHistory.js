// Utility for managing recently accessed files, documents, photos, videos, and folders

const RECENT_KEY = 'mycloud_recent_history';
const MAX_RECENT_ITEMS = 30;

export function getRecentHistory() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse recent history:', e);
    return [];
  }
}

export function recordRecentItem(item) {
  if (!item || (!item.id && !item.folder_id)) return;
  try {
    const history = getRecentHistory();
    const itemId = item.id || `folder_${item.folder_id}`;

    // Filter out existing item
    const filtered = history.filter((i) => {
      const existingId = i.id || `folder_${i.folder_id}`;
      return existingId !== itemId;
    });

    const newItem = {
      ...item,
      id: item.id || null,
      folder_id: item.folder_id || null,
      name: item.displayName || item.display_name || item.name || item.original_name || 'Item',
      type: item.is_folder ? 'folder' : (item.media_type || 'file'),
      opened_at: new Date().toISOString()
    };

    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to record recent item:', e);
  }
}

export function clearRecentHistory() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch (e) {
    console.error('Failed to clear recent history:', e);
  }
}

