/**
 * Utility for managing saved accounts on the local device.
 * STRICT RULE: Admin accounts must NEVER be saved or switchable from this list.
 * Only regular users and public accounts (if previously logged in on this device) are kept.
 */

const STORAGE_KEY = 'mycloud_device_accounts';

export function getSavedAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strict filter: never include admin
    return parsed.filter(
      (acc) => acc && acc.role !== 'admin' && acc.username !== 'admin'
    );
  } catch (e) {
    console.error('Error reading saved accounts:', e);
    return [];
  }
}

export function saveAccount(user, token) {
  if (!user || user.role === 'admin' || user.username === 'admin') {
    return; // NEVER save admin account to device
  }

  try {
    const accounts = getSavedAccounts();
    const existingIndex = accounts.findIndex((a) => a.id === user.id);

    const accountData = {
      id: user.id,
      username: user.username,
      role: user.role,
      avatar_url: user.avatar_url || null,
      token: token || null,
      lastUsed: Date.now()
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = {
        ...accounts[existingIndex],
        ...accountData,
        // Retain previous token if new one is null
        token: token || accounts[existingIndex].token
      };
    } else {
      accounts.push(accountData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return accounts;
  } catch (e) {
    console.error('Error saving account to device:', e);
  }
}

export function removeAccount(userId) {
  try {
    const accounts = getSavedAccounts().filter((a) => a.id !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return accounts;
  } catch (e) {
    console.error('Error removing account from device:', e);
    return [];
  }
}

export function updateSavedAccountProfile(user) {
  if (!user || user.role === 'admin' || user.username === 'admin') return;
  try {
    const accounts = getSavedAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx >= 0) {
      accounts[idx].avatar_url = user.avatar_url;
      accounts[idx].username = user.username;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}
}

