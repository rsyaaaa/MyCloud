const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const { vaultToken, ...customOptions } = options;
  const headers = { ...(customOptions.headers || {}) };

  if (!(customOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (vaultToken) {
    headers['x-vault-token'] = vaultToken;
  }

  // Persistent Session Header
  const authToken = localStorage.getItem('mycloud_auth_token');
  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...customOptions,
    headers,
    credentials: 'include'
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function uploadWithProgress(endpoint, formData, { onProgress, signal, vaultToken } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${endpoint}`);
    xhr.withCredentials = true;

    if (vaultToken) {
      xhr.setRequestHeader('x-vault-token', vaultToken);
    }

    const authToken = localStorage.getItem('mycloud_auth_token');
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }

    if (signal) {
      if (signal.aborted) {
        return reject(new DOMException('Upload dibatalkan', 'AbortError'));
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload dibatalkan', 'AbortError'));
      });
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent
          });
        }
      };
    }

    xhr.onload = () => {
      let data = null;
      const contentType = xhr.getResponseHeader('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          data = JSON.parse(xhr.responseText);
        } else {
          data = xhr.responseText;
        }
      } catch (e) {
        data = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const errorMsg = (data && data.error) || (typeof data === 'string' ? data : `Request failed with status ${xhr.status}`);
        const error = new Error(errorMsg);
        error.status = xhr.status;
        error.data = data;
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Koneksi jaringan terputus atau gagal terhubung ke server MyCloud.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timeout.'));
    };

    xhr.send(formData);
  });
}

// ==========================================
// In-Memory Multi-Layer Cache System
// Provides 0ms instant display when navigating folders, gallery, and tabs
// ==========================================
const apiCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh TTL
const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes stale usable for 0ms transitions

export function getCachedMedia(params = {}) {
  const query = new URLSearchParams(params).toString();
  const cacheKey = `media:${query}`;
  const entry = apiCache.get(cacheKey);
  if (entry && (Date.now() - entry.timestamp < CACHE_MAX_AGE_MS) && entry.data) {
    return entry.data;
  }
  return null;
}

export function getCachedCategories(type = '') {
  const cacheKey = `categories:${type || 'all'}`;
  const entry = apiCache.get(cacheKey);
  if (entry && (Date.now() - entry.timestamp < CACHE_MAX_AGE_MS) && entry.data) {
    return entry.data;
  }
  return null;
}

export function invalidateApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear();
  } else {
    for (const key of Array.from(apiCache.keys())) {
      if (key.startsWith(prefix)) {
        apiCache.delete(key);
      }
    }
  }
}

// Auto-sync with reactive media mutations
if (typeof window !== 'undefined') {
  window.addEventListener('mycloud:media_mutation', (e) => {
    const event = e.detail || {};
    if (event.type === 'favorite') {
      for (const [key, entry] of apiCache.entries()) {
        if (key.startsWith('media:') && entry.data && Array.isArray(entry.data.media)) {
          entry.data.media = entry.data.media.map((m) =>
            m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m
          );
        }
      }
    } else if (event.type === 'rename') {
      for (const [key, entry] of apiCache.entries()) {
        if (key.startsWith('media:') && entry.data && Array.isArray(entry.data.media)) {
          entry.data.media = entry.data.media.map((m) =>
            m.id === event.id ? { ...m, display_name: event.name } : m
          );
        }
      }
    } else if (event.type === 'delete' || event.type === 'lock') {
      for (const [key, entry] of apiCache.entries()) {
        if (key.startsWith('media:') && entry.data && Array.isArray(entry.data.media)) {
          entry.data.media = entry.data.media.filter((m) => m.id !== event.id);
        }
      }
    } else {
      invalidateApiCache('media:');
      invalidateApiCache('categories:');
    }
  });
}

export const api = {
  // Auth
  login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  loginPublic: () => apiRequest('/auth/public-login', { method: 'POST' }),
  switchUser: (token, userId) => apiRequest('/auth/switch-user', { method: 'POST', body: JSON.stringify({ token, userId }) }),
  register: (username, password) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/auth/me'),

  // Avatar System
  getAvatarUrl: (user) => {
    if (!user) return '/avatars/user_default.jpg';
    if (user.avatar_url) return user.avatar_url;
    return user.role === 'admin' ? '/avatars/admin_default.jpg' : '/avatars/user_default.jpg';
  },
  uploadAvatar: (formData) => apiRequest('/auth/avatar', { method: 'POST', body: formData }),
  resetAvatar: () => apiRequest('/auth/avatar', { method: 'DELETE' }),

  // Safe Vault PIN
  setupPin: (pin) => apiRequest('/auth/vault/setup-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  verifyPin: (pin) => apiRequest('/auth/vault/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),

  // Media
    listMedia: async (params = {}, options = {}) => {
      const query = new URLSearchParams(params).toString();
      const cacheKey = `media:${query}`;
      const cached = apiCache.get(cacheKey);
      const now = Date.now();

      // Return fresh cached data immediately (0ms)
      if (!options.forceRefresh && cached && cached.data && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
      }

      // Deduplicate in-flight fetch
      if (cached && cached.inflightPromise) {
        return cached.inflightPromise;
      }

      const inflightPromise = apiRequest(`/media${query ? `?${query}` : ''}`)
        .then((data) => {
          apiCache.set(cacheKey, { data, timestamp: Date.now(), inflightPromise: null });
          return data;
        })
        .catch((err) => {
          if (cached) cached.inflightPromise = null;
          throw err;
        });

      if (cached) {
        cached.inflightPromise = inflightPromise;
      } else {
        apiCache.set(cacheKey, { data: null, timestamp: 0, inflightPromise });
      }

      // If caller allows stale or if we have cached data and forceRefresh wasn't requested:
      if (!options.forceRefresh && cached && cached.data) {
        return cached.data;
      }

      return inflightPromise;
    },
      getCachedMedia,
      getCachedCategories,
      invalidateCache: invalidateApiCache,
        getMediaStats: () => apiRequest('/media/stats/summary'),
          getMedia: (id) => apiRequest(`/media/${id}`),
            getTextContent: (id) => apiRequest(`/media/${id}/text`),
              saveTextContent: (id, content) => apiRequest(`/media/${id}/text`, { method: 'PUT', body: JSON.stringify({ content }) }),
                          uploadMedia: (formData, onProgress, signal) =>
                            uploadWithProgress('/media/upload', formData, { onProgress, signal }).then((res) => {
                              invalidateApiCache('media:');
                              return res;
                            }),
                            updateMedia: (id, updates) =>
                              apiRequest(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }).then((res) => {
                                invalidateApiCache('media:');
                                return res;
                              }),
                              lockMedia: (id) =>
                                apiRequest(`/media/${id}/lock`, { method: 'POST' }).then((res) => {
                                  invalidateApiCache('media:');
                                  return res;
                                }),
                                unlockMedia: (id, vaultToken) =>
                                  apiRequest(`/media/${id}/unlock`, { method: 'POST', vaultToken }).then((res) => {
                                    invalidateApiCache('media:');
                                    return res;
                                  }),
                                  deleteMedia: (id, vaultToken) =>
                                    apiRequest(`/media/${id}`, { method: 'DELETE', vaultToken }).then((res) => {
                                      invalidateApiCache('media:');
                                      return res;
                                    }),
                                    listVaultMedia: (vaultToken) => apiRequest('/media/vault/list', { vaultToken }),

                                      // Trash System (Folder Sampah)
                                      listTrash: () => apiRequest('/media/trash/list'),
                                              restoreFromTrash: (id) =>
                                                apiRequest(`/media/trash/${id}/restore`, { method: 'POST' }).then((res) => {
                                                  invalidateApiCache('media:');
                                                  return res;
                                                }),
                                                deletePermanently: (id) =>
                                                  apiRequest(`/media/trash/${id}/permanent`, { method: 'DELETE' }).then((res) => {
                                                    invalidateApiCache('media:');
                                                    return res;
                                                  }),
                                                  emptyTrash: () =>
                                                    apiRequest('/media/trash/empty', { method: 'POST' }).then((res) => {
                                                      invalidateApiCache('media:');
                                                      return res;
                                                    }),

                                                    // Streaming URLs (with auth query param fallback for WebView & <img>/<video> tags)
                                                    getStreamUrl: (id) => {
                                                      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mycloud_auth_token') : null;
                                                      return token ? `${API_BASE}/stream/${id}?token=${encodeURIComponent(token)}` : `${API_BASE}/stream/${id}`;
                                                    },
                                                      getThumbnailUrl: (id) => {
                                                        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mycloud_auth_token') : null;
                                                        return token ? `${API_BASE}/stream/thumbnail/${id}?token=${encodeURIComponent(token)}` : `${API_BASE}/stream/thumbnail/${id}`;
                                                      },
                                                        getDownloadUrl: (id) => {
                                                          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mycloud_auth_token') : null;
                                                          return token ? `${API_BASE}/stream/download/${id}?token=${encodeURIComponent(token)}` : `${API_BASE}/stream/download/${id}`;
                                                        },
                                                          getVaultStreamUrl: (id, vaultToken) => {
                                                            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mycloud_auth_token') : null;
                                                            const authPart = token ? `&token=${encodeURIComponent(token)}` : '';
                                                            return `${API_BASE}/stream/vault/media/${id}?vault_token=${encodeURIComponent(vaultToken)}${authPart}`;
                                                          },
                                                            getVaultThumbnailUrl: (id, vaultToken) => {
                                                              const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mycloud_auth_token') : null;
                                                              const authPart = token ? `&token=${encodeURIComponent(token)}` : '';
                                                              return `${API_BASE}/stream/vault/thumbnail/${id}?vault_token=${encodeURIComponent(vaultToken)}${authPart}`;
                                                            },

                                                              // Memories Engine
                                                              getMemories: () => apiRequest('/memories'),

                                                                // Categories & Folders
                                                                          listCategories: async (type = '', options = {}) => {
                                                                            const cacheKey = `categories:${type || 'all'}`;
                                                                            const cached = apiCache.get(cacheKey);
                                                                            const now = Date.now();

                                                                            if (!options.forceRefresh && cached && cached.data && (now - cached.timestamp < CACHE_TTL_MS)) {
                                                                              return cached.data;
                                                                            }

                                                                            if (cached && cached.inflightPromise) {
                                                                              return cached.inflightPromise;
                                                                            }

                                                                            const inflightPromise = apiRequest(`/categories${type ? `?type=${type}` : ''}`)
                                                                              .then((data) => {
                                                                                apiCache.set(cacheKey, { data, timestamp: Date.now(), inflightPromise: null });
                                                                                return data;
                                                                              })
                                                                              .catch((err) => {
                                                                                if (cached) cached.inflightPromise = null;
                                                                                throw err;
                                                                              });

                                                                            if (cached) {
                                                                              cached.inflightPromise = inflightPromise;
                                                                            } else {
                                                                              apiCache.set(cacheKey, { data: null, timestamp: 0, inflightPromise });
                                                                            }

                                                                            if (!options.forceRefresh && cached && cached.data) {
                                                                              return cached.data;
                                                                            }

                                                                            return inflightPromise;
                                                                          },
                                                                            createCategory: (name, type = 'folder') =>
                                                                              apiRequest('/categories', { method: 'POST', body: JSON.stringify({ name, type }) }).then((res) => {
                                                                                invalidateApiCache('categories:');
                                                                                return res;
                                                                              }),
                                                                              renameCategory: (id, name) =>
                                                                                apiRequest(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }).then((res) => {
                                                                                  invalidateApiCache('categories:');
                                                                                  return res;
                                                                                }),
                                                                                deleteCategory: (id) =>
                                                                                  apiRequest(`/categories/${id}`, { method: 'DELETE' }).then((res) => {
                                                                                    invalidateApiCache('categories:');
                                                                                    invalidateApiCache('media:');
                                                                                    return res;
                                                                                  }),
                                                                                  assignCategories: (media_id, category_ids) =>
                                                                                    apiRequest('/categories/assign', { method: 'POST', body: JSON.stringify({ media_id, category_ids }) }).then((res) => {
                                                                                      invalidateApiCache('categories:');
                                                                                      invalidateApiCache('media:');
                                                                                      return res;
                                                                                    }),
                                                                                    getMediaCategories: (mediaId) => apiRequest(`/categories/media/${mediaId}`),

                                                                                      // Watch Progress
                                                                                      getProgress: (mediaId) => apiRequest(`/watch-progress/${mediaId}`),
                                                                                        saveProgress: (mediaId, last_position_seconds) => apiRequest(`/watch-progress/${mediaId}`, { method: 'POST', body: JSON.stringify({ last_position_seconds }) }),

                                                                                          // Quota & Admin
                                                                                          requestQuota: (requested_gb, reason) => apiRequest('/quota/request', { method: 'POST', body: JSON.stringify({ requested_gb, reason }) }),
                                                                                            getMyQuotaRequests: () => apiRequest('/quota/my-requests'),
                                                                                              getAdminQuotaRequests: () => apiRequest('/admin/requests'),
                                                                                                actionAdminQuotaRequest: (id, action) => apiRequest(`/admin/requests/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
                                                                                                  getAdminStats: () => apiRequest('/admin/system-stats'),
                                                                                                    getAdminUsers: () => apiRequest('/admin/users'),
                                                                                                      updateUserQuota: (userId, quota_gb) => apiRequest(`/admin/users/${userId}/quota`, { method: 'PATCH', body: JSON.stringify({ quota_gb }) }),
};

