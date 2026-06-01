export const storageKeys = {
  accessToken: 'aw_accessToken',
  refreshToken: 'aw_refreshToken',
};

export function getStoredToken() {
  return localStorage.getItem(storageKeys.accessToken) || '';
}

export function persistSession(accessToken, refreshToken) {
  localStorage.setItem(storageKeys.accessToken, accessToken);
  localStorage.setItem(storageKeys.refreshToken, refreshToken || '');
}

export function clearSession() {
  localStorage.removeItem(storageKeys.accessToken);
  localStorage.removeItem(storageKeys.refreshToken);
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
}

export async function readApiError(response) {
  try {
    const payload = await response.json();
    return payload?.message || payload?.error || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

export async function fetchProfile(accessToken) {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/auth/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = await response.json();
  return payload?.data ?? payload;
}
