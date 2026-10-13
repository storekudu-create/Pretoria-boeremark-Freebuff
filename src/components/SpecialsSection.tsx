import React, { useMemo } from 'react';
import { useStore } from '../store';
import { trackEvent } from '../lib/api';
import { specialState } from '../../shared/specials';

export default function SpecialsSection({ showAll = false }: { showAll?: boolean }): React.ReactElement | null {
  const { data, t, specials, locateStall, selectStall } = useStore();
  const list = useMemo(() => {
    if (!data) return [];
    if (showAll) {
      return [...data.specials].sort((a, b) => {
        const order = { active: 0, scheduled: 1, expired: 2, inactive: 3 } as const;
        return order[specialState(a)] - order[specialState(b)];
      });
    }
    return specials;
  }, [data, specials, showAll]);

  if (!data || list.length === 0) {
    return <p className="muted">{t('specials.none')}</p>;
  }

  return (
    <ul className="special-list">
      {list.map((sp) => {
        const stall = data.stalls.find((s) => s.id === sp.stallId);
        const vendor = data.vendors.find((v) => v.id === sp.vendorId);
        const state = specialState(sp);
        return (
          <li key={sp.id} className={`special-item special-item--${state}`}>
            {sp.image && <img src={sp.image} alt="" loading="lazy" />}
            <div className="special-body">
              <div className="special-top">
                <b>{sp.title}</b>
                {state !== 'active' && <span className={`badge badge--${state}`}>{state}</span>}
              </div>
              {vendor && <span className="special-vendor">{vendor.businessName}</span>}
              {stall && (
                <span className="special-stall">
                  {t('stall.number')} {stall.stallNumber} · {t('stall.near')} {stall.streetName}
                </span>
              )}
              {sp.description && <p className="special-desc">{sp.description}</p>}
              <div className="special-prices">
                {sp.normalPrice && <span>{t('specials.normal')} <s>{sp.normalPrice}</s></span>}
                {sp.price && <b>{sp.price}</b>}
                {sp.endDate && <span className="special-until">{t('specials.until')} {sp.endDate}</span>}
              </div>
              <div className="special-actions">
                {stall && (
                  <>
                    <button
                      type="button"
                      className="btn btn--small"
                      onClick={() => { trackEvent('special_view', sp.id); selectStall(stall.id); }}
                    >
                      {t('specials.view')}
                    </button>
                    <button type="button" className="btn btn--small btn--primary" onClick={() => { trackEvent('special_view', sp.id); locateStall(stall.id); }}>
                      {t('search.locate')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
