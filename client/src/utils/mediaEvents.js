// Reactive media event bus for real-time UI updates without page reloads
const MEDIA_EVENT = 'mycloud:media_mutation';

/**
 * Dispatch a media mutation event (upload, delete, favorite, rename, lock, restore, etc.)
 */
export function triggerMediaEvent(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MEDIA_EVENT, { detail }));
  }
}

/**
 * Subscribe to media mutation events in React components
 * Returns an unsubscribe cleanup function
 */
export function subscribeMediaEvent(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (callback) callback(e.detail || {});
  };
  window.addEventListener(MEDIA_EVENT, handler);
  return () => {
    window.removeEventListener(MEDIA_EVENT, handler);
  };
}
