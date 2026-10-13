import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../store';
import { admin, adminLogin, adminLogout, adminSession, fetchAnalytics } from '../lib/api';
import type { AnalyticsStat } from '../lib/api';

type TabId =
  | 'stalls' | 'vendors' | 'products' | 'categories'
  | 'specials' | 'pricing' | 'sponsors' | 'analytics';

type Values = Record<string, string>;

interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  span?: boolean;
}

interface RowDef {
  id: string;
  values: Values;
  cells: ReactNode[];
}

const YES_NO = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const LEVELS = [
  { value: 'free', label: 'Free' },
  { value: 'featured', label: 'Featured' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'premium', label: 'Premium' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'closed', label: 'Closed' },
];

function Field({
  def, value, onChange,
}: { def: FieldDef; value: string; onChange: (v: string) => void }): React.ReactElement {
  const id = `f-${def.name}`;
  return (
    <div className={`field${def.span ? ' span-2' : ''}`}>
      <label htmlFor={id}>{def.label}</label>
      {def.type === 'select' ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : def.type === 'textarea' ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          type={def.type === 'number' ? 'text' : 'text'}
          inputMode={def.type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function Form({
  fields, values, setValues, onSave, onCancel, busy,
}: {
  fields: FieldDef[];
  values: Values;
  setValues: (v: Values) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}): React.ReactElement {
  return (
    <form
      className="admin-form"
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
    >
      {fields.map((f) => (
        <Field
          key={f.name}
          def={f}
          value={values[f.name] ?? ''}
          onChange={(v) => setValues({ ...values, [f.name]: v })}
        />
      ))}
      <div className="admin-form-actions">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {admin_save}
        </button>
        <button type="button" className="btn" onClick={onCancel}>{admin_cancel}</button>
      </div>
    </form>
  );
}

const admin_save = 'Save';
const admin_cancel = 'Cancel';

function Table({ rows, onEdit, onDelete }: {
  rows: RowDef[];
  onEdit: (r: RowDef) => void;
  onDelete: (id: string) => void;
}): React.ReactElement {
  if (rows.length === 0) return <p className="muted">Nothing here yet.</p>;
  return (
    <table className="admin-table">
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {r.cells.map((c, i) => <td key={i}>{c}</td>)}
            <td>
              <span className="admin-actions">
                <button type="button" className="btn btn--small" onClick={() => onEdit(r)}>Edit</button>
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => { if (window.confirm('Delete this item?')) onDelete(r.id); }}
                >Delete</button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface TabDef {
  labelKey: string;
  fields: FieldDef[];
  rows: (data: import('../../shared/types').MarketData) => RowDef[];
  create?: (v: Values) => Promise<boolean>;
  update: (id: string, v: Values) => Promise<boolean>;
  remove?: (id: string) => Promise<boolean>;
  creatable: boolean;
}

export default function Admin(): React.ReactElement {
  const { t, data, refresh } = useStore();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState<TabId>('stalls');
  const [values, setValues] = useState<Values | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsStat | null>(null);

  useEffect(() => {
    let alive = true;
    adminSession().then((ok) => {
      if (!alive) return;
      setAuthed(ok);
      setChecking(false);
    });
    return () => { alive = false; };
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(() => {
    if (!authed || tab !== 'analytics') return;
    let alive = true;
    void fetchAnalytics().then((a) => { if (alive) setAnalytics(a); });
    return () => { alive = false; };
  }, [authed, tab]);

  const catOpts = useMemo(
    () => (data?.categories ?? []).map((c) => ({ value: c.id, label: c.nameEn })),
    [data],
  );
  const vendorOpts = useMemo(
    () => (data?.vendors ?? []).map((v) => ({ value: v.id, label: v.businessName })),
    [data],
  );
  const stallOpts = useMemo(
    () => (data?.stalls ?? []).map((s) => ({ value: s.id, label: `Stall ${s.stallNumber}` })),
    [data],
  );

  const tabs = useMemo<Record<TabId, TabDef>>(() => ({
    stalls: {
      labelKey: 'admin.tab.stalls',
      creatable: true,
      fields: [
        { name: 'stallNumber', label: 'Stall number' },
        { name: 'streetName', label: 'Street' },
        {
          name: 'status', label: 'Status', type: 'select',
          options: STATUSES,
        },
        { name: 'featuredLevel', label: 'Ad tier', type: 'select', options: LEVELS },
        { name: 'vendorId', label: 'Vendor', type: 'select', options: [{ value: '', label: '— vacant —' }, ...vendorOpts] },
        { name: 'categoryId', label: 'Category', type: 'select', options: [{ value: '', label: '— none —' }, ...catOpts] },
        { name: 'saturdaySpecial', label: 'Saturday special', type: 'select', options: YES_NO },
        { name: 'x', label: 'X', type: 'number' },
        { name: 'y', label: 'Y', type: 'number' },
        { name: 'width', label: 'Width', type: 'number' },
        { name: 'height', label: 'Height', type: 'number' },
        { name: 'sortOrder', label: 'Sort order', type: 'number' },
      ],
      rows: (d) => d.stalls
        .filter((s) => !search || s.stallNumber.includes(search)
          || (d.vendors.find((v) => v.id === s.vendorId)?.businessName ?? '').toLowerCase().includes(search.toLowerCase()))
        .map((s) => ({
          id: s.id,
          values: {
            stallNumber: s.stallNumber, streetName: s.streetName, status: s.status,
            featuredLevel: s.featuredLevel, vendorId: s.vendorId ?? '', categoryId: s.categoryId ?? '',
            saturdaySpecial: String(s.saturdaySpecial), x: String(s.x), y: String(s.y),
            width: String(s.width), height: String(s.height), sortOrder: String(s.sortOrder),
          },
          cells: [
            <b key="n">{s.stallNumber}</b>,
            <span key="s">{s.streetName}</span>,
            <span key="st" className={`badge badge--${s.status}`}>{s.status}</span>,
            s.featuredLevel !== 'free'
              ? <span key="l" className={`badge badge--${s.featuredLevel}`}>{s.featuredLevel}</span>
              : <span key="l" className="muted">free</span>,
            <span key="v">{d.vendors.find((v) => v.id === s.vendorId)?.businessName ?? '—'}</span>,
            <span key="c">{s.saturdaySpecial ? '%' : ''}</span>,
          ],
        })),
      create: (v) => admin.createStall(v),
      update: (id, v) => admin.updateStall(id, v),
      remove: (id) => admin.deleteStall(id),
    },
    vendors: {
      labelKey: 'admin.tab.vendors',
      creatable: true,
      fields: [
        { name: 'businessName', label: 'Business name', span: true },
        { name: 'categoryId', label: 'Category', type: 'select', options: catOpts },
        { name: 'phone', label: 'Phone' },
        { name: 'whatsapp', label: 'WhatsApp' },
        { name: 'website', label: 'Website' },
        { name: 'description', label: 'Description', type: 'textarea', span: true },
      ],
      rows: (d) => d.vendors
        .filter((v) => !search || v.businessName.toLowerCase().includes(search.toLowerCase()))
        .map((v) => ({
          id: v.id,
          values: {
            businessName: v.businessName, categoryId: v.categoryId, phone: v.phone,
            whatsapp: v.whatsapp, website: v.website, description: v.description,
          },
          cells: [
            <b key="b">{v.businessName}</b>,
            <span key="c">{d.categories.find((c) => c.id === v.categoryId)?.nameEn ?? v.categoryId}</span>,
            <span key="p">{v.phone}</span>,
            <span key="w">{v.website || '—'}</span>,
          ],
        })),
      create: (v) => admin.createVendor(v),
      update: (id, v) => admin.updateVendor(id, v),
      remove: (id) => admin.deleteVendor(id),
    },
    products: {
      labelKey: 'admin.tab.products',
      creatable: true,
      fields: [
        { name: 'vendorId', label: 'Vendor', type: 'select', options: vendorOpts },
        { name: 'name', label: 'Product name' },
        { name: 'price', label: 'Price' },
        { name: 'keywords', label: 'Keywords', span: true },
        { name: 'description', label: 'Description', type: 'textarea', span: true },
      ],
      rows: (d) => d.products
        .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
        .map((p) => ({
          id: p.id,
          values: {
            vendorId: p.vendorId, name: p.name, price: p.price,
            keywords: p.keywords, description: p.description,
          },
          cells: [
            <b key="n">{p.name}</b>,
            <span key="v">{d.vendors.find((x) => x.id === p.vendorId)?.businessName ?? '—'}</span>,
            <span key="p" className="product-price">{p.price}</span>,
          ],
        })),
      create: (v) => admin.createProduct(v),
      update: (id, v) => admin.updateProduct(id, v),
      remove: (id) => admin.deleteProduct(id),
    },
    categories: {
      labelKey: 'admin.tab.categories',
      creatable: true,
      fields: [
        { name: 'nameEn', label: 'Name (EN)' },
        { name: 'nameAf', label: 'Name (AF)' },
        { name: 'icon', label: 'Icon (emoji)' },
        { name: 'sortOrder', label: 'Sort order', type: 'number' },
      ],
      rows: (d) => d.categories
        .filter((c) => !search || c.nameEn.toLowerCase().includes(search.toLowerCase()))
        .map((c) => ({
          id: c.id,
          values: {
            nameEn: c.nameEn, nameAf: c.nameAf, icon: c.icon, sortOrder: String(c.sortOrder),
          },
          cells: [
            <span key="i">{c.icon}</span>,
            <b key="e">{c.nameEn}</b>,
            <span key="a">{c.nameAf}</span>,
            <span key="n">
              {(d.vendors.filter((v) => v.categoryId === c.id)).length} vendors
            </span>,
          ],
        })),
      create: (v) => admin.createCategory(v),
      update: (id, v) => admin.updateCategory(id, v),
      remove: (id) => admin.deleteCategory(id),
    },
    specials: {
      labelKey: 'admin.tab.specials',
      creatable: true,
      fields: [
        { name: 'title', label: 'Title', span: true },
        { name: 'vendorId', label: 'Vendor', type: 'select', options: vendorOpts },
        { name: 'stallId', label: 'Stall', type: 'select', options: stallOpts },
        { name: 'price', label: 'Special price' },
        { name: 'normalPrice', label: 'Normal price' },
        { name: 'startDate', label: 'Start (YYYY-MM-DD)' },
        { name: 'endDate', label: 'End (YYYY-MM-DD)' },
        { name: 'active', label: 'Active', type: 'select', options: YES_NO },
        { name: 'description', label: 'Description', type: 'textarea', span: true },
      ],
      rows: (d) => d.specials
        .filter((s) => !search || s.title.toLowerCase().includes(search.toLowerCase()))
        .map((s) => ({
          id: s.id,
          values: {
            title: s.title, vendorId: s.vendorId, stallId: s.stallId, price: s.price,
            normalPrice: s.normalPrice, startDate: s.startDate, endDate: s.endDate,
            active: String(s.active), description: s.description,
          },
          cells: [
            <b key="t">{s.title}</b>,
            <span key="v">{d.vendors.find((x) => x.id === s.vendorId)?.businessName ?? '—'}</span>,
            <span key="d">{s.startDate} → {s.endDate}</span>,
            <span key="a" className={`badge badge--${s.active ? 'open' : 'closed'}`}>
              {s.active ? 'active' : 'off'}
            </span>,
          ],
        })),
      create: (v) => admin.createSpecial(v),
      update: (id, v) => admin.updateSpecial(id, v),
      remove: (id) => admin.deleteSpecial(id),
    },
    pricing: {
      labelKey: 'admin.tab.pricing',
      creatable: false,
      fields: [
        { name: 'priceZar', label: 'Price (ZAR/month)', type: 'number' },
        { name: 'active', label: 'Active', type: 'select', options: YES_NO },
        { name: 'features', label: 'Features (comma separated)', span: true },
      ],
      rows: (d) => d.pricing
        .filter((p) => !search || p.tier.toLowerCase().includes(search.toLowerCase()))
        .map((p) => ({
          id: p.id,
          values: {
            priceZar: String(p.priceZar),
            active: String(p.active),
            features: p.features.join(', '),
          },
          cells: [
            <b key="t">{p.tier}</b>,
            <span key="p">R{p.priceZar}</span>,
            <span key="f" className="muted">{p.features.join(' · ')}</span>,
            <span key="a" className={`badge badge--${p.active ? 'open' : 'closed'}`}>
              {p.active ? 'active' : 'off'}
            </span>,
          ],
        })),
      update: (id, v) => admin.updatePricing(id, {
        priceZar: v.priceZar,
        active: v.active,
        features: v.features.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    },
    sponsors: {
      labelKey: 'admin.tab.sponsors',
      creatable: true,
      fields: [
        { name: 'name', label: 'Sponsor name', span: true },
        { name: 'type', label: 'Type', type: 'select', options: [
          { value: 'category', label: 'Category' }, { value: 'map', label: 'Map' },
        ] },
        { name: 'categoryId', label: 'Category', type: 'select', options: [{ value: '', label: '— none —' }, ...catOpts] },
        { name: 'url', label: 'URL' },
        { name: 'active', label: 'Active', type: 'select', options: YES_NO },
        { name: 'image', label: 'Image URL', span: true },
      ],
      rows: (d) => d.sponsors
        .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()))
        .map((s) => ({
          id: s.id,
          values: {
            name: s.name, type: s.type, categoryId: s.categoryId ?? '',
            url: s.url, active: String(s.active), image: s.image,
          },
          cells: [
            <b key="n">{s.name}</b>,
            <span key="t">{s.type}</span>,
            <span key="c">{s.categoryId ?? '—'}</span>,
            <span key="a" className={`badge badge--${s.active ? 'open' : 'closed'}`}>
              {s.active ? 'active' : 'off'}
            </span>,
          ],
        })),
      create: (v) => admin.createSponsor(v),
      update: (id, v) => admin.updateSponsor(id, v),
      remove: (id) => admin.deleteSponsor(id),
    },
    analytics: { labelKey: 'admin.tab.analytics', creatable: false, fields: [], rows: () => [], update: async () => false },
  }), [data, search, catOpts, vendorOpts, stallOpts]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await adminLogin(password);
    setBusy(false);
    if (ok) {
      setAuthed(true);
      setFormError('');
      setPassword('');
    } else {
      setFormError(t('admin.badPassword'));
    }
  };

  const startCreate = () => {
    const defaults: Values = {};
    for (const f of tabs[tab].fields) {
      defaults[f.name] = f.type === 'select' ? (f.options?.[0]?.value ?? '') : '';
    }
    setEditingId(null);
    setValues(defaults);
  };

  const startEdit = (r: RowDef) => {
    setEditingId(r.id);
    setValues({ ...r.values });
  };

  const onSave = async () => {
    if (!values) return;
    setBusy(true);
    const ok = editingId
      ? await tabs[tab].update(editingId, values)
      : (tabs[tab].create ? await tabs[tab].create(values) : false);
    setBusy(false);
    if (ok) {
      setValues(null);
      setEditingId(null);
      refresh();
      flash(t('admin.saved'));
    } else {
      flash(t('admin.error'));
    }
  };

  const onDelete = async (id: string) => {
    const fn = tabs[tab].remove;
    if (!fn) return;
    setBusy(true);
    const ok = await fn(id);
    setBusy(false);
    if (ok) {
      refresh();
      flash(t('admin.deleted'));
    } else {
      flash(t('admin.error'));
    }
  };

  const onReset = async () => {
    if (!window.confirm(t('admin.resetConfirm'))) return;
    setBusy(true);
    const ok = await admin.resetDemo();
    setBusy(false);
    if (ok) {
      refresh();
      flash(t('admin.saved'));
    } else {
      flash(t('admin.error'));
    }
  };

  const doLogout = async () => {
    await adminLogout();
    setAuthed(false);
  };

  if (checking) return <p className="muted">{t('loading')}</p>;

  if (!authed) {
    return (
      <form className="admin-login" onSubmit={doLogin}>
        <h2>{t('admin.title')}</h2>
        <div className="field">
          <label htmlFor="admin-pw">{t('admin.password')}</label>
          <input
            id="admin-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {formError && <p className="form-error">{formError}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy || !password}>
          {t('admin.signIn')}
        </button>
      </form>
    );
  }

  const current = tabs[tab];
  const rows = data ? current.rows(data) : [];

  return (
    <div className="admin">
      <div className="admin-bar">
        <h2 className="section-title" style={{ margin: 0 }}>{t('admin.title')}</h2>
        <span className="admin-actions">
          <button type="button" className="btn btn--small" onClick={() => void onReset()} disabled={busy}>
            {t('admin.reset')}
          </button>
          <button type="button" className="btn btn--small" onClick={() => void doLogout()}>
            {t('admin.signOut')}
          </button>
        </span>
      </div>

      <div className="admin-tabs" role="tablist" aria-label={t('admin.title')}>
        {(Object.keys(tabs) as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`chip${tab === id ? ' chip--on' : ''}`}
            onClick={() => { setTab(id); setValues(null); setEditingId(null); setSearch(''); }}
          >{t(tabs[id].labelKey)}</button>
        ))}
      </div>

      {tab !== 'analytics' && (
        <>
          <div className="admin-bar">
            <input
              type="search"
              placeholder={t('admin.search')}
              aria-label={t('admin.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, minWidth: 200 }}
            />
            {current.creatable && !values && (
              <button type="button" className="btn btn--primary" onClick={startCreate}>
                {t('admin.create')}
              </button>
            )}
          </div>

          {values && (
            <Form
              fields={current.fields}
              values={values}
              setValues={setValues}
              onSave={() => void onSave()}
              onCancel={() => { setValues(null); setEditingId(null); }}
              busy={busy}
            />
          )}

          <Table rows={rows} onEdit={startEdit} onDelete={(id) => void onDelete(id)} />
        </>
      )}

      {tab === 'analytics' && (
        analytics ? (
          <div className="stat-grid">
            <StatCard title={t('admin.topSearches')} items={analytics.topSearches} />
            <StatCard title={t('admin.mostViewed')} items={analytics.mostViewedStalls} />
            <StatCard title={t('admin.popularCategories')} items={analytics.popularCategories} />
            <StatCard title={t('admin.specialClicks')} items={analytics.specialClicks} />
            <StatCard title={t('admin.featuredPerformance')} items={analytics.featuredPerformance} />
            <StatCard title={t('admin.totals')} items={analytics.totals} />
          </div>
        ) : (
          <p className="muted">{t('admin.noAnalytics')}</p>
        )
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

type StatItem = { count: number; label?: string; keyword?: string; type?: string };

function StatCard({ title, items }: {
  title: string;
  items: StatItem[];
}): React.ReactElement {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <ul className="stat-list">
          {items.map((i) => (
            <li key={i.label ?? i.keyword ?? i.type ?? String(i.count)}>
              <span>{i.label ?? i.keyword ?? i.type ?? ''}</span><b>{i.count}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
