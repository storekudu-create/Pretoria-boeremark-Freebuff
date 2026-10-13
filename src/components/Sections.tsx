import React, { useMemo } from 'react';
import { useStore } from '../store';

export function FeaturedSection(): React.ReactElement | null {
  const { data, t, selectStall, locateStall } = useStore();
  const featured = useMemo(() => {
    if (!data) return [];
    const order = { premium: 0, promoted: 1, featured: 2, free: 3 } as const;
    return data.stalls
      .filter((s) => s.featuredLevel !== 'free' && s.vendorId)
      .sort((a, b) => order[a.featuredLevel] - order[b.featuredLevel])
      .slice(0, 12);
  }, [data]);
  if (!data || featured.length === 0) return null;

  return (
    <div className="featured-row">
      {featured.map((s) => {
        const v = data.vendors.find((x) => x.id === s.vendorId)!;
        return (
          <div key={s.id} className={`featured-card featured-card--${s.featuredLevel}`}>
            {v.featuredImage && <img src={v.featuredImage} alt="" loading="lazy" />}
            <div className="featured-body">
              <b>{v.businessName}</b>
              <span>{t('stall.number')} {s.stallNumber}</span>
              {v.description && <p>{v.description.slice(0, 70)}…</p>}
              <div className="featured-actions">
                <button type="button" className="btn btn--small" onClick={() => selectStall(s.id, { track: true })}>
                  {t('stall.viewProfile')}
                </button>
                <button type="button" className="btn btn--small btn--primary" onClick={() => locateStall(s.id)}>
                  {t('featured.viewAll')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SponsorSection(): React.ReactElement | null {
  const { data } = useStore();
  if (!data) return null;
  const sponsors = data.sponsors.filter((s) => s.active);
  const mapSponsors = sponsors.filter((s) => s.type === 'map');
  if (mapSponsors.length === 0) return null;
  return (
    <div className="sponsor-box">
      {mapSponsors.map((s) => (
        <div key={s.id} className="sponsor-item">
          {s.image && <img src={s.image} alt="" loading="lazy" />}
          <span>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

export function PricingSection(): React.ReactElement | null {
  const { data, t } = useStore();
  if (!data) return null;
  const rows = data.pricing.filter((p) => p.active);
  if (rows.length === 0) return null;
  const catSponsors = data.sponsors.filter((s) => s.active && s.type === 'category');

  return (
    <section className="pricing" aria-label={t('pricing.title')}>
      <h2 className="section-title">{t('pricing.title')}</h2>
      <p className="muted small">{t('pricing.note')}</p>
      <div className="pricing-grid">
        {rows.map((p) => (
          <div key={p.id} className={`pricing-card pricing-card--${p.tier}`}>
            <b className="pricing-tier">{p.tier.replace('_', ' ')}</b>
            <span className="pricing-price">
              {p.priceZar === 0 ? t('pricing.free') : <>R{p.priceZar}<small>{t('pricing.perMonth')}</small></>}
            </span>
            <ul>
              {p.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {catSponsors.length > 0 && (
        <div className="cat-sponsors">
          {catSponsors.map((s) => (
            <span key={s.id} className="cat-sponsor-label">
              {t('sponsor.categoryLabel')}: {s.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function StallGrid(): React.ReactElement | null {
  const { data, results, query, categoryId, t, lang, selectStall, locateStall } = useStore();
  if (!data) return null;
  const list = query.trim() || categoryId ? results : results;
  if (list.length === 0) {
    return <p className="muted">{t('search.noResults')}</p>;
  }
  return (
    <ul className="stall-grid">
      {list.map((m) => {
        const cat = m.category;
        return (
          <li key={m.stall.id} className={`stall-card${m.stall.status !== 'open' ? ' stall-card--muted' : ''}`}>
            <div className="stall-card-head">
              <b>{t('stall.number')} {m.stall.stallNumber}</b>
              {m.vendor && <span>{m.vendor.businessName}</span>}
            </div>
            <div className="stall-card-meta">
              {cat && <span>{cat.icon} {lang === 'af' ? cat.nameAf : cat.nameEn}</span>}
              <span>📍 {m.stall.streetName}</span>
              {m.stall.status === 'vacant' && <span className="badge badge--vacant">{t('stall.vacant')}</span>}
              {m.stall.status === 'closed' && <span className="badge badge--closed">{t('stall.closed')}</span>}
              {m.stall.featuredLevel !== 'free' && (
                <span className={`badge badge--${m.stall.featuredLevel}`}>{t(`stall.badge${m.stall.featuredLevel[0].toUpperCase()}${m.stall.featuredLevel.slice(1)}`)}</span>
              )}
            </div>
            {m.vendor && (
              <button type="button" className="btn btn--small" onClick={() => selectStall(m.stall.id, { track: true })}>
                {t('stall.viewProfile')}
              </button>
            )}
            <button type="button" className="btn btn--small btn--primary" onClick={() => locateStall(m.stall.id)}>
              {t('search.locate')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function CategoriesView(): React.ReactElement | null {
  const { data, t, lang, categoryId, setCategoryId } = useStore();
  if (!data) return null;
  return (
    <div className="cat-grid">
      {[...data.categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => {
        const count = data.stalls.filter((s) => {
          const v = s.vendorId ? data.vendors.find((x) => x.id === s.vendorId) : null;
          return v?.categoryId === c.id;
        }).length;
        const sponsor = data.sponsors.find((s) => s.active && s.type === 'category' && s.categoryId === c.id);
        return (
          <button
            key={c.id}
            type="button"
            className={`cat-card${categoryId === c.id ? ' cat-card--on' : ''}`}
            onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
          >
            <span className="cat-icon" aria-hidden="true">{c.icon}</span>
            <b>{lang === 'af' ? c.nameAf : c.nameEn}</b>
            <span className="cat-count">{count}</span>
            {sponsor && <span className="cat-sponsor-flag">{t('sponsor.categoryLabel')}</span>}
          </button>
        );
      })}
    </div>
  );
}
