import React, { useCallback, useEffect, useMemo } from 'react';
import { StoreProvider, stallById, useStore } from './store';
import type { ViewId } from './store';
import SearchBar from './components/SearchBar';
import CategoryChips from './components/CategoryChips';
import ResultList from './components/ResultList';
import MarketMap from './components/MarketMap';
import StallProfile from './components/StallProfile';
import SpecialsSection from './components/SpecialsSection';
import Admin from './components/Admin';
import {
  CategoriesView, FeaturedSection, PricingSection, SponsorSection, StallGrid,
} from './components/Sections';

const NAV: Array<{ id: ViewId; key: string }> = [
  { id: 'home', key: 'nav.map' },
  { id: 'search', key: 'nav.search' },
  { id: 'stalls', key: 'nav.stalls' },
  { id: 'specials', key: 'nav.specials' },
  { id: 'categories', key: 'nav.categories' },
  { id: 'admin', key: 'nav.admin' },
];

function Legend(): React.ReactElement {
  const { t } = useStore();
  const items: Array<[string, string]> = [
    ['legend-dot legend-dot--selected', t('legend.selected')],
    ['legend-dot legend-dot--result', t('legend.result')],
    ['legend-dot legend-dot--featured', t('legend.featured')],
    ['legend-dot legend-dot--special', t('legend.special')],
    ['legend-dot legend-dot--vacant', t('legend.vacant')],
    ['legend-dot legend-dot--closed', t('legend.closed')],
  ];
  return (
    <ul className="legend" aria-label={t('map.legend')}>
      {items.map(([cls, label]) => (
        <li key={label}><span className={cls} aria-hidden="true" />{label}</li>
      ))}
    </ul>
  );
}

function OfflineBanner(): React.ReactElement | null {
  const { offline, t } = useStore();
  if (!offline) return null;
  return (
    <div className="banner banner--offline" role="status">
      <b>{t('offline.title')}</b> {t('offline.body')}
    </div>
  );
}

function HomeView(): React.ReactElement {
  const { t, data, results, selectedStallId, selectStall, locateNonce, categoryId, query } = useStore();
  const highlightIds = useMemo(() => new Set(results.map((m) => m.stall.id)), [results]);
  const badgeIds = useMemo(
    () => new Set((data?.stalls ?? []).filter((s) => s.saturdaySpecial).map((s) => s.id)),
    [data],
  );
  if (!data) return <p className="muted">{t('loading')}</p>;
  return (
    <>
      <SearchBar />
      <CategoryChips compact />
      <section className="map-section" aria-label={t('map.title')}>
        <MarketMap
          data={data}
          highlightIds={query.trim() ? highlightIds : new Set<string>()}
          selectedId={selectedStallId}
          onSelect={(id) => selectStall(id, { track: true })}
          locateNonce={locateNonce}
          filteredCategoryId={categoryId}
          badgeIds={badgeIds}
        />
        <p className="map-hint">{t('map.hint')}</p>
        <Legend />
        <SponsorSection />
      </section>
      <section className="section">
        <h2 className="section-title">{t('home.featured')}</h2>
        <FeaturedSection />
      </section>
      <section className="section">
        <h2 className="section-title">{t('home.specials')}</h2>
        <SpecialsSection />
      </section>
      <section className="section">
        <PricingSection />
      </section>
    </>
  );
}

function SearchView(): React.ReactElement {
  const { t, data, results, selectedStallId, selectStall, locateNonce, categoryId, query, setView } = useStore();
  const highlightIds = useMemo(() => new Set(results.map((m) => m.stall.id)), [results]);
  const badgeIds = useMemo(
    () => new Set((data?.stalls ?? []).filter((s) => s.saturdaySpecial).map((s) => s.id)),
    [data],
  );
  useEffect(() => {
    if (!query.trim() && !categoryId) setView('home');
  }, [query, categoryId, setView]);
  if (!data) return <p className="muted">{t('loading')}</p>;
  return (
    <>
      <SearchBar />
      <CategoryChips compact />
      <ResultList />
      <section className="map-section" aria-label={t('map.title')}>
        <MarketMap
          data={data}
          highlightIds={highlightIds}
          selectedId={selectedStallId}
          onSelect={(id) => selectStall(id, { track: true })}
          locateNonce={locateNonce}
          filteredCategoryId={categoryId}
          badgeIds={badgeIds}
        />
        <Legend />
      </section>
    </>
  );
}

function ProfileLayer(): React.ReactElement | null {
  const { data, selectedStallId, selectStall, locateStall, t, lang } = useStore();
  if (!data || !selectedStallId) return null;
  const stall = stallById(data, selectedStallId);
  if (!stall) return null;
  return (
    <StallProfile
      data={data}
      stall={stall}
      onClose={() => selectStall(null)}
      onLocate={locateStall}
      t={t}
      lang={lang}
    />
  );
}

function Shell(): React.ReactElement {
  const {
    t, lang, setLang, view, setView, loading, error, refresh, data,
  } = useStore();

  const go = useCallback((v: ViewId) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [setView]);

  if (loading && !data) {
    return (
      <div className="boot">
        <div className="spinner" aria-hidden="true" />
        <p>{t('loading')}</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="boot">
        <p className="banner banner--error">{t('error.load')}</p>
        <button type="button" className="btn btn--primary" onClick={refresh}>{t('retry')}</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <h1 className="brand">{t('app.title')}</h1>
          <div className="lang-switch" role="group" aria-label="Language">
            <button
              type="button"
              className={`lang-btn${lang === 'en' ? ' lang-btn--on' : ''}`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >{t('lang.en')}</button>
            <button
              type="button"
              className={`lang-btn${lang === 'af' ? ' lang-btn--on' : ''}`}
              onClick={() => setLang('af')}
              aria-pressed={lang === 'af'}
            >{t('lang.af')}</button>
          </div>
        </div>
        <p className="disclaimer" role="note">{t('footer.disclaimer')}</p>
      </header>

      <OfflineBanner />

      <nav className="tabs" aria-label="Primary">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`tab${view === n.id ? ' tab--on' : ''}`}
            aria-current={view === n.id ? 'page' : undefined}
            onClick={() => go(n.id)}
          >{t(n.key)}</button>
        ))}
      </nav>

      <main className="content">
        {view === 'home' && <HomeView />}
        {view === 'search' && <SearchView />}
        {view === 'stalls' && (
          <section className="section">
            <h2 className="section-title">{t('nav.stalls')}</h2>
            <CategoryChips compact />
            <StallGrid />
          </section>
        )}
        {view === 'specials' && (
          <section className="section">
            <h2 className="section-title">{t('specials.title')}</h2>
            <SpecialsSection showAll />
          </section>
        )}
        {view === 'categories' && (
          <section className="section">
            <h2 className="section-title">{t('nav.categories')}</h2>
            <CategoriesView />
          </section>
        )}
        {view === 'admin' && <Admin />}
      </main>

      <ProfileLayer />

      <footer className="footer">
        <p>{t('footer.disclaimer')}</p>
        <p className="muted">{t('footer.dataNote')}</p>
      </footer>
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
