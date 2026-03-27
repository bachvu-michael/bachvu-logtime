import { setToken, clearToken, getToken } from '../utils/authFetch';

export async function checkAuthRequired(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) return false;
    const { required } = await res.json() as { required: boolean };
    return required;
  } catch {
    return false;
  }
}

export async function login(password: string): Promise<boolean> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return false;
  const { token } = await res.json() as { token: string };
  setToken(token);
  return true;
}

export async function logout(): Promise<void> {
  const token = getToken();
  clearToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

export const isAuthenticated = () => !!getToken();
