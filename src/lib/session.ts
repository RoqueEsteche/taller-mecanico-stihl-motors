export type UserRole = 'admin' | 'receiver' | 'mechanic' | 'stock_manager';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

const tokenStorageKey = 'stihl.session.token';
const userStorageKey = 'stihl.session.user';
const productionApiBase = 'https://stihl-motors.onrender.com';

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionToken() {
  return window.localStorage.getItem(tokenStorageKey);
}

export function getSessionUser(): SessionUser | null {
  const rawUser = window.localStorage.getItem(userStorageKey);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    window.localStorage.removeItem(userStorageKey);
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  window.localStorage.setItem(tokenStorageKey, token);
  window.localStorage.setItem(userStorageKey, JSON.stringify(user));
  notifyListeners();
}

export function clearSession() {
  window.localStorage.removeItem(tokenStorageKey);
  window.localStorage.removeItem(userStorageKey);
  notifyListeners();
}

const envApiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
const isNativeCapacitor =
  typeof window !== 'undefined' &&
  typeof (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === 'function' &&
  Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

const API_BASE = envApiBase ?? (isNativeCapacitor ? productionApiBase : '');

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let message = 'La solicitud no se pudo completar.';

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function loginWithPassword(email: string, password: string) {
  const data = await apiRequest<{ token: string; user: SessionUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setSession(data.token, data.user);
  return data.user;
}

export async function restoreSession() {
  const token = getSessionToken();
  if (!token) return null;

  try {
    const data = await apiRequest<{ user: SessionUser }>('/api/session');
    setSession(token, data.user);
    return data.user;
  } catch {
    clearSession();
    return null;
  }
}