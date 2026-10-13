import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import type { MarketData, Stall } from '../shared/types';
import { searchMarket } from '../shared/search';
import type { SearchMatch } from '../shared/search';
import { activeSpecials } from '../shared/specials';
import { detectLang, translate } from './lib/i18n';
import type { Lang } from './lib/i18n';
import { fetchMarketData, trackEvent } from './lib/api';

const LS_LANG = 'bm_lang';
const LS_DATA = 'bm_data_v1';

export type ViewId = 'home' | 'search' | 'stalls' | 'specials' | 'categories' | 'admin';

interface StoreValue {
  data: MarketData | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  view: ViewId;
  setView: (v: ViewId) => void;
  query: string;
  setQuery: (q: string) => void;
  categoryId: string | null;
  setCategoryId: (id: string | null) => void;
  results: SearchMatch[];
  selectedStallId: string | null;
  selectStall: (id: string | null, opts?: { track?: boolean }) => void;
  locateStall: (id: string) => void;
  locateNonce: number;
  specials: ReturnType<typeof activeSpecials>;
  refresh: () => void;
  setData: (d: MarketData) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('Store missing');
  return v;
}

export function StoreProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [data, setDataState] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [lang, setLangState] = useState<Lang>(() => detectLang());
  const [view, setView] = useState<ViewId>('home');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [locateNonce, setLocateNonce] = useState(0);
  const searchTrackRef = useRef(0);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LS_LANG, l); } catch { /* ignore */ }
  }, []);

  const setData = useCallback((d: MarketData) => {
    setDataState(d);
    try { localStorage.setItem(LS_DATA, JSON.stringify(d)); } catch { /* quota ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchMarketData();
      setData(d);
      setOffline(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) {
        // Viewer password gate: reload so the server login page is shown.
        window.location.reload();
        return;
      }
      // Offline / server down: fall back to cached copy.
      let cached: MarketData | null = null;
      try {
        const raw = localStorage.getItem(LS_DATA);
        if (raw) cached = JSON.parse(raw) as MarketData;
      } catch { /* ignore */ }
      if (cached) {
        setDataState(cached);
        setOffline(true);
        setError(null);
      } else {
        setError('load_failed');
      }
    } finally {
      setLoading(false);
    }
  }, [setData]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const results = useMemo<SearchMatch[]>(() => {
    if (!data) return [];
    return searchMarket(data, query, categoryId);
  }, [data, query, categoryId]);

  // Debounced search analytics (no personal data, keyword only).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const id = window.setTimeout(() => {
      const now = Date.now();
      if (now - searchTrackRef.current < 1000) return;
      searchTrackRef.current = now;
      trackEvent('search', '', q.toLowerCase());
    }, 700);
    return () => window.clearTimeout(id);
  }, [query]);

  const selectStall = useCallback((id: string | null, opts?: { track?: boolean }) => {
    setSelectedStallId(id);
    if (id && opts?.track) trackEvent('profile_view', id);
  }, []);

  const locateStall = useCallback((id: string) => {
    setView('home');
    setSelectedStallId(id);
    setLocateNonce((n) => n + 1);
    trackEvent('stall_locate', id);
  }, []);

  const setCategoryIdTracked = useCallback((id: string | null) => {
    setCategoryId(id);
    if (id) trackEvent('category_click', id);
  }, []);

  const setQueryTracked = useCallback((q: string) => {
    setQuery(q);
    if (q.trim() && view !== 'search') setView('search');
  }, [view]);

  const refresh = useCallback(() => { void load(); }, [load]);

  const specials = useMemo(() => (data ? activeSpecials(data.specials) : []), [data]);

  const value: StoreValue = {
    data, loading, error, offline, lang, setLang, t, view, setView,
    query, setQuery: setQueryTracked, categoryId, setCategoryId: setCategoryIdTracked,
    results, selectedStallId, selectStall, locateStall, locateNonce, specials, refresh, setData,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function stallById(data: MarketData, id: string | null): Stall | null {
  if (!id) return null;
  return data.stalls.find((s) => s.id === id) ?? null;
}
