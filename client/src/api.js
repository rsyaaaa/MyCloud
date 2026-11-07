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

export const api = {
  // Auth
  login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
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
  listMedia: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/media${query ? `?${query}` : ''}`);
  },
  getMedia: (id) => apiRequest(`/media/${id}`),
  uploadMedia: (formData) => apiRequest('/media/upload', { method: 'POST', body: formData }),
  updateMedia: (id, updates) => apiRequest(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  lockMedia: (id) => apiRequest(`/media/${id}/lock`, { method: 'POST' }),
  unlockMedia: (id, vaultToken) => apiRequest(`/media/${id}/unlock`, { method: 'POST', vaultToken }),
  deleteMedia: (id, vaultToken) => apiRequest(`/media/${id}`, { method: 'DELETE', vaultToken }),
  listVaultMedia: (vaultToken) => apiRequest('/media/vault/list', { vaultToken }),

  // Trash System (Folder Sampah)
  listTrash: () => apiRequest('/media/trash/list'),
  restoreFromTrash: (id) => apiRequest(`/media/trash/${id}/restore`, { method: 'POST' }),
  deletePermanently: (id) => apiRequest(`/media/trash/${id}/permanent`, { method: 'DELETE' }),
  emptyTrash: () => apiRequest('/media/trash/empty', { method: 'POST' }),

  // Streaming URLs
  getStreamUrl: (id) => `${API_BASE}/stream/${id}`,
  getThumbnailUrl: (id) => `${API_BASE}/stream/thumbnail/${id}`,
  getDownloadUrl: (id) => `${API_BASE}/stream/download/${id}`,
  getVaultStreamUrl: (id, vaultToken) => `${API_BASE}/stream/vault/media/${id}?vault_token=${encodeURIComponent(vaultToken)}`,
  getVaultThumbnailUrl: (id, vaultToken) => `${API_BASE}/stream/vault/thumbnail/${id}?vault_token=${encodeURIComponent(vaultToken)}`,

  // Memories Engine
  getMemories: () => apiRequest('/memories'),

  // Categories & Folders
  listCategories: (type) => apiRequest(`/categories${type ? `?type=${type}` : ''}`),
  createCategory: (name, type) => apiRequest('/categories', { method: 'POST', body: JSON.stringify({ name, type }) }),
  deleteCategory: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
  assignCategories: (media_id, category_ids) => apiRequest('/categories/assign', { method: 'POST', body: JSON.stringify({ media_id, category_ids }) }),
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

