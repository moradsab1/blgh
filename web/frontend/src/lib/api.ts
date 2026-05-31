import { APP_VERSION } from '../version';
import { API_BASE_URL } from '../config';
import { getToken } from '../auth/token';
import type { ApiError } from './contracts';

const UPDATE_REQUIRED_EVENT = 'balagh:update-required';

function getDeviceId(): string {
  const stored = localStorage.getItem('balagh_device_id');
  if (stored) return stored;
  const id = `dashboard-${crypto.randomUUID()}`;
  localStorage.setItem('balagh_device_id', id);
  return id;
}

export function dispatchUpdateRequired(): void {
  window.dispatchEvent(new CustomEvent(UPDATE_REQUIRED_EVENT));
}

export function onUpdateRequired(handler: () => void): () => void {
  window.addEventListener(UPDATE_REQUIRED_EVENT, handler);
  return () => window.removeEventListener(UPDATE_REQUIRED_EVENT, handler);
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
    'X-App-Version': APP_VERSION,
    ...(init.headers as Record<string, string> | undefined),
  };

  if (withAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 426) {
    dispatchUpdateRequired();
    throw new ApiRequestError('UPDATE_REQUIRED', 'Please update the app', 426);
  }

  if (!res.ok) {
    let body: ApiError = { code: 'UNKNOWN', message: res.statusText };
    try { body = (await res.json()) as ApiError; } catch { /* ignore */ }
    throw new ApiRequestError(body.code, body.message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, withAuth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, withAuth),
  adminPost: <T>(path: string) =>
    request<T>(path, { method: 'POST' }, true),
};
