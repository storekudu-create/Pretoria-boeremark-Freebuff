import React, { useEffect, useMemo, useRef } from 'react';
import type { MarketData, Special, Stall } from '../../shared/types';
import { specialState } from '../../shared/specials';
import { telLink, waLink } from '../../shared/format';
import { trackEvent } from '../lib/api';

interface Props {
  data: MarketData;
  stall: Stall;
  onClose: () => void;
  onLocate: (id: string) => void;
  t: (k: string) => string;
  lang: string;
}

const LEVEL_LABEL: Record<string, string> = {
  free: '',
  featured: 'stall.badgeFeatured',
  promoted: 'stall.badgePromoted',
  premium: 'stall.badgePremium',
};

export default function StallProfile({ data, stall, onClose, onLocate, t, lang }: Props): React.ReactElement {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const vendor = useMemo(() => {
    if (!stall.vendorId) return null;
    return data.vendors.find((v) => v.id === stall.vendorId) ?? null;
  }, [data.vendors, stall.vendorId]);

  const category = useMemo(() => {
    if (!vendor) return null;
    return data.categories.find((c) => c.id === vendor.categoryId) ?? null;
  }, [data.categories, vendor]);

  const products = useMemo(() => {
    if (!vendor) return [];
    return data.products.filter((p) => p.vendorId === vendor.id);
  }, [data.products, vendor]);

  const special: Special | null = useMemo(() => {
    const list = data.specials.filter((s) => s.stallId === stall.id && specialState(s) === 'active');
    return list[0] ?? null;
  }, [data.specials, stall.id]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [stall.id]);

  const displayName = lang === 'af' && category ? (category.nameAf || category.nameEn) : (category?.nameEn ?? '');

  const canShowContact = stall.featuredLevel !== 'free';

  return (
    <div className="profile" ref={panelRef} tabIndex={-1} role="dialog" aria-modal="false" aria-label={`Stall ${stall.stallNumber}`}>
      <div className="profile-head">
        <div className="profile-title">
          <span className="profile-stallno">{t('stall.number')} {stall.stallNumber}</span>
          {stall.streetName && (
            <span className="profile-street">{t('stall.near')} {stall.streetName}</span>
          )}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t('stall.close')}>✕</button>
      </div>

      {vendor && (
        <div className="profile-badges">
          {vendor.isDemo && <span className="badge badge--demo">{t('stall.demo')}</span>}
          {LEVEL_LABEL[stall.featuredLevel] && (
            <span className={`badge badge--${stall.featuredLevel}`}>{t(LEVEL_LABEL[stall.featuredLevel])}</span>
          )}
          {stall.status === 'closed' && <span className="badge badge--closed">{t('stall.closed')}</span>}
          {stall.status === 'open' && <span className="badge badge--open">{t('stall.open')}</span>}
          {displayName && <span className="badge badge--cat">{displayName}</span>}
        </div>
      )}

      {vendor ? (
        <>
          {vendor.featuredImage && (
            <img className="profile-hero" src={vendor.featuredImage} alt="" loading="lazy" />
          )}
          <h3 className="profile-name">{vendor.businessName}</h3>
          {vendor.description && <p className="profile-desc">{vendor.description}</p>}

          {special && (
            <div className="profile-special">
              <strong>{t('stall.special')}</strong>
              <span>{special.title}</span>
              {special.description && <em>{special.description}</em>}
              <span className="price-row">
                {special.normalPrice && <s>{special.normalPrice}</s>}
                <b>{special.price}</b>
              </span>
            </div>
          )}

          <h4 className="profile-sub">{t('stall.products')}</h4>
          {products.length > 0 ? (
            <ul className="product-list">
              {products.map((p) => (
                <li key={p.id}>
                  <span className="product-name">{p.name}</span>
                  {p.price && <span className="product-price">{p.price}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile-muted">{t('stall.noProducts')}</p>
          )}

          {canShowContact ? (
            <div className="profile-actions">
              {vendor.whatsapp && (
                <a
                  className="btn btn--wa"
                  href={waLink(vendor.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('whatsapp_click', stall.id)}
                >
                  {t('stall.whatsapp')}
                </a>
              )}
              {vendor.phone && (
                <a
                  className="btn btn--call"
                  href={telLink(vendor.phone)}
                  onClick={() => trackEvent('call_click', stall.id)}
                >
                  {t('stall.call')}
                </a>
              )}
              {vendor.website && (
                <a className="btn btn--web" href={vendor.website} target="_blank" rel="noopener noreferrer">
                  {t('stall.website')}
                </a>
              )}
            </div>
          ) : (
            <p className="profile-muted">{t('stall.contactHidden')}</p>
          )}

          {vendor.socials.length > 0 && (
            <div className="profile-socials">
              {vendor.socials.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
              ))}
            </div>
          )}

          {vendor.gallery.length > 0 && (
            <div className="profile-gallery">
              {vendor.gallery.map((g, i) => (
                <img key={i} src={g} alt="" loading="lazy" />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="profile-muted">{t('stall.vacant')}</p>
      )}

      <div className="profile-actions profile-actions--foot">
        <button type="button" className="btn btn--primary" onClick={() => onLocate(stall.id)}>
          {t('stall.locate')}
        </button>
        <button type="button" className="btn" onClick={onClose}>{t('stall.close')}</button>
      </div>
    </div>
  );
}
