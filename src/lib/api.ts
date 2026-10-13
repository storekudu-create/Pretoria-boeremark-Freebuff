import type { MarketData } from '../../shared/types';
import { buildSeedData } from '../../shared/seed';

export interface AnalyticsStat {
  topSearches: Array<{ keyword: string; count: number }>;
  mostViewedStalls: Array<{ label: string; count: number }>;
  popularCategories: Array<{ label: string; count: number }>;
  specialClicks: Array<{ label: string; count: number }>;
  featuredPerformance: Array<{ label: string; count: number }>;
  totals: Array<{ type: string; count: number }>;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const err = new Error(`http_${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export async function fetchMarketData(): Promise<MarketData> {
  try {
    const r = await req<{ ok: boolean; data: MarketData }>('/api/data');
    return r.data;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) throw error;
    return buildSeedData();
  }
}

export type AnalyticsEventType =
  | 'search' | 'profile_view' | 'stall_locate' | 'whatsapp_click'
  | 'call_click' | 'category_click' | 'special_view' | 'pwa_install';

/** Fire-and-forget analytics. Never throws, never blocks UI. */
export function trackEvent(type: AnalyticsEventType, refId = '', keyword = ''): void {
  const body = JSON.stringify({ type, refId, keyword });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch { /* fall through to fetch */ }
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export async function loginAccess(password: string): Promise<boolean> {
  try {
    await req('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
    return true;
  } catch {
    return false;
  }
}

export async function adminLogin(password: string): Promise<boolean> {
  try {
    await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    return true;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  await req('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
}

export async function adminSession(): Promise<boolean> {
  try {
    await req('/api/admin/session');
    return true;
  } catch {
    return false;
  }
}

async function adminMut(method: string, path: string, body?: unknown): Promise<boolean> {
  try {
    await req(`/api/admin${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return true;
  } catch {
    return false;
  }
}

export const admin = {
  createStall: (body: unknown) => adminMut('POST', '/stalls', body),
  updateStall: (id: string, body: unknown) => adminMut('PUT', `/stalls/${encodeURIComponent(id)}`, body),
  deleteStall: (id: string) => adminMut('DELETE', `/stalls/${encodeURIComponent(id)}`),
  createVendor: (body: unknown) => adminMut('POST', '/vendors', body),
  updateVendor: (id: string, body: unknown) => adminMut('PUT', `/vendors/${encodeURIComponent(id)}`, body),
  deleteVendor: (id: string) => adminMut('DELETE', `/vendors/${encodeURIComponent(id)}`),
  createProduct: (body: unknown) => adminMut('POST', '/products', body),
  updateProduct: (id: string, body: unknown) => adminMut('PUT', `/products/${encodeURIComponent(id)}`, body),
  deleteProduct: (id: string) => adminMut('DELETE', `/products/${encodeURIComponent(id)}`),
  createCategory: (body: unknown) => adminMut('POST', '/categories', body),
  updateCategory: (id: string, body: unknown) => adminMut('PUT', `/categories/${encodeURIComponent(id)}`, body),
  deleteCategory: (id: string) => adminMut('DELETE', `/categories/${encodeURIComponent(id)}`),
  createSpecial: (body: unknown) => adminMut('POST', '/specials', body),
  updateSpecial: (id: string, body: unknown) => adminMut('PUT', `/specials/${encodeURIComponent(id)}`, body),
  deleteSpecial: (id: string) => adminMut('DELETE', `/specials/${encodeURIComponent(id)}`),
  updatePricing: (id: string, body: unknown) => adminMut('PUT', `/pricing/${encodeURIComponent(id)}`, body),
  createSponsor: (body: unknown) => adminMut('POST', '/sponsors', body),
  updateSponsor: (id: string, body: unknown) => adminMut('PUT', `/sponsors/${encodeURIComponent(id)}`, body),
  deleteSponsor: (id: string) => adminMut('DELETE', `/sponsors/${encodeURIComponent(id)}`),
  resetDemo: () => adminMut('POST', '/reset-demo'),
};

export async function fetchAnalytics(): Promise<AnalyticsStat | null> {
  try {
    const r = await req<{ ok: boolean; analytics: AnalyticsStat }>('/api/admin/analytics');
    return r.analytics;
  } catch {
    return null;
  }
}
