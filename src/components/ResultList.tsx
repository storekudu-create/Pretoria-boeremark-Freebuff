import React from 'react';
import { useStore } from '../store';
import { categoryColor } from '../../shared/categories';

export default function ResultList(): React.ReactElement | null {
  const { results, query, t, lang, data, locateStall, selectStall } = useStore();
  if (!data) return null;
  if (!query.trim()) return null;

  return (
    <section className="results" aria-live="polite">
      <h2 className="section-title">
        {t('results.for')} “{query.trim()}” — {results.length} {t('search.results')}
      </h2>
      {results.length === 0 && <p className="muted">{t('search.noResults')}</p>}
      <ul className="result-list">
        {results.map((m) => {
          const cat = m.category;
          const summary = m.matchedProducts.slice(0, 3).map((p) => p.name).join(', ');
          return (
            <li key={m.stall.id} className="result-item">
              <span
                className="result-dot"
                style={{ background: cat ? categoryColor(cat.id) : '#9aa79b' }}
                aria-hidden="true"
              />
              <button type="button" className="result-main" onClick={() => selectStall(m.stall.id, { track: true })}>
                <span className="result-top">
                  <b>{t('stall.number')} {m.stall.stallNumber}</b>
                  {m.vendor && <span>{m.vendor.businessName}</span>}
                </span>
                <span className="result-meta">
                  {cat && <span>{lang === 'af' ? cat.nameAf : cat.nameEn}</span>}
                  {m.stall.streetName && <span>· {t('stall.near')} {m.stall.streetName}</span>}
                  {m.stall.saturdaySpecial && <span className="pill-special">%</span>}
                </span>
                {summary && <span className="result-summary">{summary}</span>}
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => locateStall(m.stall.id)}
              >
                {t('search.locate')}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
