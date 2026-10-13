import { Hono } from 'hono';
import type { D1Like } from './db';
import { ensureSchema, loadMarketData, seedIfEmpty } from './db';
import { parseCookies, sessionCookie, signToken, verifyToken } from './auth';
import { buildSeedData } from '../shared/seed';
import type { MarketData } from '../shared/types';

export interface Env {
  DB: D1Like;
  ASSETS: { fetch(req: Request): Promise<Response> };
  SESSION_SECRET: string;
  ACCESS_PASSWORD: string;
  ADMIN_PASSWORD: string;
  DEMO_MODE: string;
}

type Vars = { admin: boolean };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

let booted: Promise<void> | null = null;
async function boot(env: Env): Promise<void> {
  if (!env.DB) return;
  if (!booted) {
    booted = (async () => {
      await ensureSchema(env.DB);
      await seedIfEmpty(env.DB, buildSeedData(new Date()));
    })();
  }
  await booted;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const MAX_IMAGE_LEN = 200_000;
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function imageOk(v: unknown): string {
  if (typeof v !== 'string') return '';
  if (v === '') return '';
  if (v.length > MAX_IMAGE_LEN) return '';
  if (DATA_URL_RE.test(v)) return v;
  if (/^https?:\/\/[^\s"']+$/i.test(v)) return v;
  return '';
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function requireFields(b: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    if (clean(b[f], 500) === '') return f;
  }
  return null;
}

// ---------- public API ----------
app.get('/api/health', () => json({ ok: true }));

app.post('/api/login', async (c) => {
  const b = await c.req.json<{ password?: string }>().catch(() => ({ password: '' }));
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!pw || pw !== c.env.ACCESS_PASSWORD) {
    return json({ error: 'bad_password' }, 401);
  }
  const token = await signToken(c.env.SESSION_SECRET, 'viewer', 60 * 60 * 24 * 30);
  const secure = new URL(c.req.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': sessionCookie('bm_session', token, 60 * 60 * 24 * 30, secure),
      'cache-control': 'no-store',
    },
  });
});

app.post('/api/logout', (c) => {
  const secure = new URL(c.req.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': sessionCookie('bm_session', '', 0, secure),
      'cache-control': 'no-store',
    },
  });
});

async function requireViewer(c: any): Promise<Response | null> {
  const cookies = parseCookies(c.req.header('cookie'));
  const ok = await verifyToken(c.env.SESSION_SECRET, 'viewer', cookies.bm_session);
  return ok ? null : json({ error: 'unauthorized' }, 401);
}

async function requireAdmin(c: any): Promise<Response | null> {
  const cookies = parseCookies(c.req.header('cookie'));
  const ok = await verifyToken(c.env.SESSION_SECRET, 'admin', cookies.bm_admin);
  if (!ok) return json({ error: 'unauthorized' }, 401);
  c.set('admin', true);
  return null;
}

function originOk(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

const adminApi = new Hono<{ Bindings: Env; Variables: Vars }>();

adminApi.use('*', async (c, next) => {
  const p = c.req.path;
  if (p.endsWith('/api/admin/login') || p.endsWith('/api/admin/logout')) {
    await next();
    return;
  }
  if (!originOk(c.req.raw)) return json({ error: 'bad_origin' }, 403);
  const guard = await requireAdmin(c);
  if (guard) return guard;
  await next();
});

adminApi.post('/login', async (c) => {
  const b = await c.req.json<{ password?: string }>().catch(() => ({ password: '' }));
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!pw || pw !== c.env.ADMIN_PASSWORD) return json({ error: 'bad_password' }, 401);
  const token = await signToken(c.env.SESSION_SECRET, 'admin', 60 * 60 * 12);
  const secure = new URL(c.req.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': sessionCookie('bm_admin', token, 60 * 60 * 12, secure),
      'cache-control': 'no-store',
    },
  });
});

adminApi.post('/logout', (c) => {
  const secure = new URL(c.req.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': sessionCookie('bm_admin', '', 0, secure),
      'cache-control': 'no-store',
    },
  });
});

adminApi.get('/session', () => json({ admin: true }));

// ---------- viewer data ----------
const dataRoute = new Hono<{ Bindings: Env }>();
dataRoute.get('/', async (c) => {
  await boot(c.env);
  const guard = await requireViewer(c);
  if (guard) return guard;
  const data = await loadMarketData(c.env.DB);
  return json({ ok: true, data } satisfies { ok: boolean; data: MarketData });
});
app.route('/api/data', dataRoute);

// ---------- analytics ----------
const ALLOWED_EVENTS = new Set([
  'search', 'profile_view', 'stall_locate', 'whatsapp_click', 'call_click',
  'category_click', 'special_view', 'pwa_install',
]);

const analyticsRoute = new Hono<{ Bindings: Env }>();
analyticsRoute.post('/', async (c) => {
  await boot(c.env);
  const guard = await requireViewer(c);
  if (guard) return guard;
  const b = await c.req.json<{ type?: string; refId?: string; keyword?: string }>().catch((): Record<string, unknown> => ({}));
  const type = typeof b.type === 'string' ? b.type : '';
  if (!ALLOWED_EVENTS.has(type)) return json({ error: 'bad_type' }, 400);
  const refId = clean(b.refId, 80);
  const keyword = clean(b.keyword, 80).toLowerCase();
  await c.env.DB.prepare('INSERT INTO analytics_events (type, ref_id, keyword) VALUES (?,?,?)')
    .bind(type, refId, keyword).run();
  return json({ ok: true });
});
app.route('/api/analytics', analyticsRoute);

// ---------- admin: stalls ----------
adminApi.get('/stalls', async (c) => {
  await boot(c.env);
  const data = await loadMarketData(c.env.DB);
  return json({ ok: true, stalls: data.stalls });
});

adminApi.post('/stalls', async (c) => {
  await boot(c.env);
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const missing = requireFields(b, ['stallNumber']);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const stallNumber = clean(b.stallNumber, 20);
  const dupe = await c.env.DB.prepare('SELECT id FROM stalls WHERE stall_number = ?').bind(stallNumber).all<{ id: string }>();
  if (dupe.results.length > 0) return json({ error: 'duplicate_number' }, 409);
  const id = clean(b.id, 60) || `stall-${stallNumber}-${Math.random().toString(36).slice(2, 6)}`;
  const status = ['open', 'vacant', 'closed'].includes(String(b.status)) ? String(b.status) : 'open';
  const level = ['free', 'featured', 'promoted', 'premium'].includes(String(b.featuredLevel)) ? String(b.featuredLevel) : 'free';
  await c.env.DB.prepare(
    'INSERT INTO stalls (id,stall_number,street_name,x,y,width,height,rotation,vendor_id,category_id,status,featured_level,saturday_special,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
  ).bind(
    id, stallNumber, clean(b.streetName, 80),
    num(b.x, 0, 20000, 0), num(b.y, 0, 20000, 0), num(b.width, 10, 2000, 90), num(b.height, 10, 2000, 60),
    num(b.rotation, -360, 360, 0), clean(b.vendorId, 60) || null, clean(b.categoryId, 60) || null,
    status, level, bool(b.saturdaySpecial) ? 1 : 0, num(b.sortOrder, 0, 100000, 0),
  ).run();
  return json({ ok: true, id });
});

adminApi.put('/stalls/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM stalls WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  if (b.stallNumber !== undefined) {
    const n = clean(b.stallNumber, 20);
    if (!n) return json({ error: 'missing:stallNumber' }, 400);
    const dupe = await c.env.DB.prepare('SELECT id FROM stalls WHERE stall_number = ? AND id != ?').bind(n, id).all<{ id: string }>();
    if (dupe.results.length > 0) return json({ error: 'duplicate_number' }, 409);
  }
  const status = ['open', 'vacant', 'closed'].includes(String(b.status)) ? String(b.status) : String(row.status);
  const level = ['free', 'featured', 'promoted', 'premium'].includes(String(b.featuredLevel)) ? String(b.featuredLevel) : String(row.featured_level);
  await c.env.DB.prepare(
    'UPDATE stalls SET stall_number=?, street_name=?, x=?, y=?, width=?, height=?, rotation=?, vendor_id=?, category_id=?, status=?, featured_level=?, saturday_special=?, sort_order=? WHERE id=?',
  ).bind(
    b.stallNumber === undefined ? String(row.stall_number) : clean(b.stallNumber, 20),
    b.streetName === undefined ? String(row.street_name) : clean(b.streetName, 80),
    b.x === undefined ? row.x : num(b.x, 0, 20000, Number(row.x)),
    b.y === undefined ? row.y : num(b.y, 0, 20000, Number(row.y)),
    b.width === undefined ? row.width : num(b.width, 10, 2000, Number(row.width)),
    b.height === undefined ? row.height : num(b.height, 10, 2000, Number(row.height)),
    b.rotation === undefined ? row.rotation : num(b.rotation, -360, 360, Number(row.rotation)),
    b.vendorId === undefined ? row.vendor_id : (clean(b.vendorId, 60) || null),
    b.categoryId === undefined ? row.category_id : (clean(b.categoryId, 60) || null),
    status, level,
    b.saturdaySpecial === undefined ? (row.saturday_special ? 1 : 0) : (bool(b.saturdaySpecial) ? 1 : 0),
    b.sortOrder === undefined ? row.sort_order : num(b.sortOrder, 0, 100000, Number(row.sort_order)),
    id,
  ).run();
  return json({ ok: true });
});

adminApi.delete('/stalls/:id', async (c) => {
  await boot(c.env);
  await c.env.DB.prepare('DELETE FROM stalls WHERE id = ?').bind(c.req.param('id')).run();
  return json({ ok: true });
});

// ---------- admin: vendors ----------
adminApi.post('/vendors', async (c) => {
  await boot(c.env);
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const missing = requireFields(b, ['businessName', 'categoryId']);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const id = clean(b.id, 60) || `vendor-${Math.random().toString(36).slice(2, 10)}`;
  const gallery = Array.isArray(b.gallery)
    ? (b.gallery as unknown[]).slice(0, 8).map((g) => imageOk(g)).filter(Boolean)
    : [];
  const socials = Array.isArray(b.socials)
    ? (b.socials as Array<{ label?: unknown; url?: unknown }>).slice(0, 6)
      .map((s) => ({ label: clean(s.label, 40), url: clean(s.url, 300) }))
      .filter((s) => s.label && /^https?:\/\//.test(s.url))
    : [];
  await c.env.DB.prepare(
    'INSERT INTO vendors (id,business_name,description,phone,whatsapp,website,logo,gallery,featured_image,category_id,socials,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).bind(
    id, clean(b.businessName, 120), clean(b.description, 2000), clean(b.phone, 40), clean(b.whatsapp, 40),
    clean(b.website, 300), imageOk(b.logo), JSON.stringify(gallery), imageOk(b.featuredImage),
    clean(b.categoryId, 60), JSON.stringify(socials), bool(b.isDemo) ? 1 : 0,
  ).run();
  return json({ ok: true, id });
});

adminApi.put('/vendors/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  const gallery = Array.isArray(b.gallery)
    ? (b.gallery as unknown[]).slice(0, 8).map((g) => imageOk(g)).filter(Boolean)
    : JSON.parse(String(row.gallery || '[]'));
  const socials = Array.isArray(b.socials)
    ? (b.socials as Array<{ label?: unknown; url?: unknown }>).slice(0, 6)
      .map((s) => ({ label: clean(s.label, 40), url: clean(s.url, 300) }))
      .filter((s) => s.label && /^https?:\/\//.test(s.url))
    : JSON.parse(String(row.socials || '[]'));
  await c.env.DB.prepare(
    'UPDATE vendors SET business_name=?, description=?, phone=?, whatsapp=?, website=?, logo=?, gallery=?, featured_image=?, category_id=?, socials=?, is_demo=? WHERE id=?',
  ).bind(
    b.businessName === undefined ? String(row.business_name) : clean(b.businessName, 120),
    b.description === undefined ? String(row.description) : clean(b.description, 2000),
    b.phone === undefined ? String(row.phone) : clean(b.phone, 40),
    b.whatsapp === undefined ? String(row.whatsapp) : clean(b.whatsapp, 40),
    b.website === undefined ? String(row.website) : clean(b.website, 300),
    b.logo === undefined ? String(row.logo) : imageOk(b.logo),
    JSON.stringify(gallery),
    b.featuredImage === undefined ? String(row.featured_image) : imageOk(b.featuredImage),
    b.categoryId === undefined ? String(row.category_id) : clean(b.categoryId, 60),
    JSON.stringify(socials),
    b.isDemo === undefined ? (row.is_demo ? 1 : 0) : (bool(b.isDemo) ? 1 : 0),
    id,
  ).run();
  return json({ ok: true });
});

adminApi.delete('/vendors/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const db = c.env.DB;
  await db.batch([
    db.prepare('DELETE FROM products WHERE vendor_id = ?').bind(id),
    db.prepare('DELETE FROM specials WHERE vendor_id = ?').bind(id),
    db.prepare('DELETE FROM advertisements WHERE vendor_id = ?').bind(id),
    db.prepare('UPDATE stalls SET vendor_id = NULL, status = ? WHERE vendor_id = ?').bind('vacant', id),
    db.prepare('DELETE FROM vendors WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
});

// ---------- admin: products ----------
adminApi.post('/products', async (c) => {
  await boot(c.env);
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const missing = requireFields(b, ['vendorId', 'name']);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const vendorId = clean(b.vendorId, 60);
  const vend = await c.env.DB.prepare('SELECT id FROM vendors WHERE id = ?').bind(vendorId).all<{ id: string }>();
  if (vend.results.length === 0) return json({ error: 'bad_vendor' }, 400);
  const id = clean(b.id, 60) || `prod-${Math.random().toString(36).slice(2, 10)}`;
  await c.env.DB.prepare('INSERT INTO products (id,vendor_id,name,description,price,keywords) VALUES (?,?,?,?,?,?)')
    .bind(id, vendorId, clean(b.name, 120), clean(b.description, 1000), clean(b.price, 40), clean(b.keywords, 400))
    .run();
  return json({ ok: true, id });
});

adminApi.put('/products/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  await c.env.DB.prepare('UPDATE products SET name=?, description=?, price=?, keywords=? WHERE id=?')
    .bind(
      b.name === undefined ? String(row.name) : clean(b.name, 120),
      b.description === undefined ? String(row.description) : clean(b.description, 1000),
      b.price === undefined ? String(row.price) : clean(b.price, 40),
      b.keywords === undefined ? String(row.keywords) : clean(b.keywords, 400),
      id,
    ).run();
  return json({ ok: true });
});

adminApi.delete('/products/:id', async (c) => {
  await boot(c.env);
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(c.req.param('id')).run();
  return json({ ok: true });
});

// ---------- admin: categories ----------
adminApi.post('/categories', async (c) => {
  await boot(c.env);
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const missing = requireFields(b, ['nameEn']);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const id = clean(b.id, 60).toLowerCase().replace(/[^a-z0-9-]/g, '') || `cat-${Math.random().toString(36).slice(2, 8)}`;
  const dupe = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(id).all<{ id: string }>();
  if (dupe.results.length > 0) return json({ error: 'duplicate_id' }, 409);
  await c.env.DB.prepare('INSERT INTO categories (id,name_en,name_af,icon,sort_order) VALUES (?,?,?,?,?)')
    .bind(id, clean(b.nameEn, 60), clean(b.nameAf, 60) || clean(b.nameEn, 60), clean(b.icon, 8), num(b.sortOrder, 0, 999, 99))
    .run();
  return json({ ok: true, id });
});

adminApi.put('/categories/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  await c.env.DB.prepare('UPDATE categories SET name_en=?, name_af=?, icon=?, sort_order=? WHERE id=?')
    .bind(
      b.nameEn === undefined ? String(row.name_en) : clean(b.nameEn, 60),
      b.nameAf === undefined ? String(row.name_af) : clean(b.nameAf, 60),
      b.icon === undefined ? String(row.icon) : clean(b.icon, 8),
      b.sortOrder === undefined ? row.sort_order : num(b.sortOrder, 0, 999, Number(row.sort_order)),
      id,
    ).run();
  return json({ ok: true });
});

adminApi.delete('/categories/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const used = await c.env.DB.prepare('SELECT COUNT(*) AS c FROM vendors WHERE category_id = ?').bind(id).all<{ c: number }>();
  if ((used.results[0]?.c ?? 0) > 0) return json({ error: 'in_use' }, 409);
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return json({ ok: true });
});

// ---------- admin: specials ----------
adminApi.get('/specials', async (c) => {
  await boot(c.env);
  const data = await loadMarketData(c.env.DB);
  return json({ ok: true, specials: data.specials });
});

adminApi.post('/specials', async (c) => {
  await boot(c.env);
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const missing = requireFields(b, ['vendorId', 'stallId', 'title', 'startDate', 'endDate']);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const start = clean(b.startDate, 10);
  const end = clean(b.endDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) {
    return json({ error: 'bad_dates' }, 400);
  }
  const stallId = clean(b.stallId, 60);
  const stall = await c.env.DB.prepare('SELECT id FROM stalls WHERE id = ?').bind(stallId).all<{ id: string }>();
  if (stall.results.length === 0) return json({ error: 'bad_stall' }, 400);
  const id = clean(b.id, 60) || `special-${Math.random().toString(36).slice(2, 10)}`;
  await c.env.DB.prepare(
    'INSERT INTO specials (id,vendor_id,stall_id,title,description,price,normal_price,image,start_date,end_date,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  ).bind(
    id, clean(b.vendorId, 60), stallId, clean(b.title, 120), clean(b.description, 1000),
    clean(b.price, 40), clean(b.normalPrice, 40), imageOk(b.image), start, end, bool(b.active) ? 1 : 0,
  ).run();
  return json({ ok: true, id });
});

adminApi.put('/specials/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM specials WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  const start = b.startDate === undefined ? String(row.start_date) : clean(b.startDate, 10);
  const end = b.endDate === undefined ? String(row.end_date) : clean(b.endDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) {
    return json({ error: 'bad_dates' }, 400);
  }
  const newStallId = b.stallId === undefined ? String(row.stall_id) : clean(b.stallId, 60);
  if (b.stallId !== undefined) {
    const st = await c.env.DB.prepare('SELECT id FROM stalls WHERE id = ?').bind(newStallId).all<{ id: string }>();
    if (st.results.length === 0) return json({ error: 'bad_stall' }, 400);
  }
  const newVendorId = b.vendorId === undefined ? String(row.vendor_id) : clean(b.vendorId, 60);
  await c.env.DB.prepare(
    'UPDATE specials SET vendor_id=?, stall_id=?, title=?, description=?, price=?, normal_price=?, image=?, start_date=?, end_date=?, active=? WHERE id=?',
  ).bind(
    newVendorId, newStallId,
    b.title === undefined ? String(row.title) : clean(b.title, 120),
    b.description === undefined ? String(row.description) : clean(b.description, 1000),
    b.price === undefined ? String(row.price) : clean(b.price, 40),
    b.normalPrice === undefined ? String(row.normal_price) : clean(b.normalPrice, 40),
    b.image === undefined ? String(row.image) : imageOk(b.image),
    start, end,
    b.active === undefined ? (row.active ? 1 : 0) : (bool(b.active) ? 1 : 0),
    id,
  ).run();
  return json({ ok: true });
});

adminApi.delete('/specials/:id', async (c) => {
  await boot(c.env);
  await c.env.DB.prepare('DELETE FROM specials WHERE id = ?').bind(c.req.param('id')).run();
  return json({ ok: true });
});

// ---------- admin: pricing ----------
adminApi.put('/pricing/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM pricing WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  const features = Array.isArray(b.features)
    ? (b.features as unknown[]).slice(0, 12).map((f) => clean(f, 120)).filter(Boolean)
    : JSON.parse(String(row.features || '[]'));
  await c.env.DB.prepare('UPDATE pricing SET price_zar=?, features=?, active=? WHERE id=?')
    .bind(
      b.priceZar === undefined ? row.price_zar : num(b.priceZar, 0, 1000000, Number(row.price_zar) || 0),
      JSON.stringify(features),
      b.active === undefined ? (row.active ? 1 : 0) : (bool(b.active) ? 1 : 0),
      id,
    ).run();
  return json({ ok: true });
});

// ---------- admin: sponsors ----------
adminApi.post('/sponsors', async (c) => {
  await boot(c.env);
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const missing = requireFields(b, ['name', 'type']);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const type = b.type === 'map' ? 'map' : 'category';
  const id = clean(b.id, 60) || `sponsor-${Math.random().toString(36).slice(2, 10)}`;
  await c.env.DB.prepare('INSERT INTO sponsors (id,name,type,image,url,active,category_id) VALUES (?,?,?,?,?,?,?)')
    .bind(id, clean(b.name, 120), type, imageOk(b.image), clean(b.url, 300), bool(b.active) ? 1 : 0, clean(b.categoryId, 60) || null)
    .run();
  return json({ ok: true, id });
});

adminApi.put('/sponsors/:id', async (c) => {
  await boot(c.env);
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>().catch((): Record<string, unknown> => ({}));
  const existing = await c.env.DB.prepare('SELECT * FROM sponsors WHERE id = ?').bind(id).all<Record<string, unknown>>();
  const row = existing.results[0];
  if (!row) return json({ error: 'not_found' }, 404);
  await c.env.DB.prepare('UPDATE sponsors SET name=?, type=?, image=?, url=?, active=?, category_id=? WHERE id=?')
    .bind(
      b.name === undefined ? String(row.name) : clean(b.name, 120),
      b.type === 'map' || b.type === 'category' ? b.type : String(row.type),
      b.image === undefined ? String(row.image) : imageOk(b.image),
      b.url === undefined ? String(row.url) : clean(b.url, 300),
      b.active === undefined ? (row.active ? 1 : 0) : (bool(b.active) ? 1 : 0),
      b.categoryId === undefined ? row.category_id : (clean(b.categoryId, 60) || null),
      id,
    ).run();
  return json({ ok: true });
});

adminApi.delete('/sponsors/:id', async (c) => {
  await boot(c.env);
  await c.env.DB.prepare('DELETE FROM sponsors WHERE id = ?').bind(c.req.param('id')).run();
  return json({ ok: true });
});

// ---------- admin: analytics ----------
adminApi.get('/analytics', async (c) => {
  await boot(c.env);
  const db = c.env.DB;
  const [topSearches, viewedStalls, popularCategories, specialClicks, totals] = await Promise.all([
    db.prepare("SELECT keyword, COUNT(*) AS count FROM analytics_events WHERE type='search' AND keyword != '' GROUP BY keyword ORDER BY count DESC LIMIT 20").all<{ keyword: string; count: number }>(),
    db.prepare("SELECT ref_id, COUNT(*) AS count FROM analytics_events WHERE type='profile_view' AND ref_id != '' GROUP BY ref_id ORDER BY count DESC LIMIT 20").all<{ ref_id: string; count: number }>(),
    db.prepare("SELECT ref_id, COUNT(*) AS count FROM analytics_events WHERE type='category_click' AND ref_id != '' GROUP BY ref_id ORDER BY count DESC LIMIT 20").all<{ ref_id: string; count: number }>(),
    db.prepare("SELECT ref_id, COUNT(*) AS count FROM analytics_events WHERE type='special_view' AND ref_id != '' GROUP BY ref_id ORDER BY count DESC LIMIT 20").all<{ ref_id: string; count: number }>(),
    db.prepare('SELECT type, COUNT(*) AS count FROM analytics_events GROUP BY type').all<{ type: string; count: number }>(),
  ]);

  const levelRows = await db.prepare(
    `SELECT s.featured_level AS level, COUNT(*) AS count
     FROM analytics_events e JOIN stalls s ON s.id = e.ref_id
     WHERE e.type='profile_view' GROUP BY s.featured_level`,
  ).all<{ level: string; count: number }>();

  const stallNumbers = new Map<string, string>();
  const st = await db.prepare('SELECT id, stall_number, vendor_id FROM stalls').all<{ id: string; stall_number: string; vendor_id: string | null }>();
  const vendorNames = new Map<string, string>();
  const vn = await db.prepare('SELECT id, business_name FROM vendors').all<{ id: string; business_name: string }>();
  for (const v of vn.results) vendorNames.set(v.id, v.business_name);
  for (const s of st.results) {
    stallNumbers.set(s.id, s.vendor_id ? `${s.stall_number} – ${vendorNames.get(s.vendor_id) ?? ''}` : s.stall_number);
  }
  const categoryNames = new Map<string, string>();
  const cn = await db.prepare('SELECT id, name_en FROM categories').all<{ id: string; name_en: string }>();
  for (const c2 of cn.results) categoryNames.set(c2.id, c2.name_en);

  return json({
    ok: true,
    analytics: {
      topSearches: topSearches.results,
      mostViewedStalls: viewedStalls.results.map((r) => ({ label: stallNumbers.get(r.ref_id) ?? r.ref_id, count: r.count })),
      popularCategories: popularCategories.results.map((r) => ({ label: categoryNames.get(r.ref_id) ?? r.ref_id, count: r.count })),
      specialClicks: specialClicks.results.map((r) => ({ label: r.ref_id, count: r.count })),
      featuredPerformance: levelRows.results.map((r) => ({ label: r.level, count: r.count })),
      totals: totals.results,
    },
  });
});

// ---------- admin: reset demo data ----------
adminApi.post('/reset-demo', async (c) => {
  await boot(c.env);
  const db = c.env.DB;
  await db.batch([
    db.prepare('DELETE FROM specials'),
    db.prepare('DELETE FROM products'),
    db.prepare('DELETE FROM advertisements'),
    db.prepare('DELETE FROM stalls'),
    db.prepare('DELETE FROM vendors'),
    db.prepare('DELETE FROM categories'),
    db.prepare('DELETE FROM pricing'),
    db.prepare('DELETE FROM sponsors'),
  ]);
  await seedIfEmpty(db, buildSeedData(new Date()));
  return json({ ok: true });
});

app.route('/api/admin', adminApi);

// ---------- static assets + viewer gate ----------
const LOGIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="robots" content="noindex, nofollow"/>
<meta name="theme-color" content="#1b5e20"/>
<title>Private Market Map Demo</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#132a16;color:#eef5ee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#1d3a21;border:1px solid #2f5a35;border-radius:16px;padding:28px 24px;max-width:380px;width:100%}
h1{font-size:1.25rem;margin:0 0 4px}p.sub{color:#b9d4ba;font-size:.9rem;margin:0 0 20px}
label{display:block;font-size:.85rem;margin-bottom:6px;color:#cfe6d0}
input{width:100%;padding:14px;border-radius:10px;border:1px solid #3c6b42;background:#12250f;color:#fff;font-size:1rem;margin-bottom:16px}
button{width:100%;padding:14px;border-radius:10px;border:0;background:#2e7d32;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}
button:active{background:#256628}
.err{color:#ffb4a8;font-size:.85rem;margin:0 0 12px;display:none}
.foot{color:#8fae91;font-size:.75rem;text-align:center;margin-top:18px;line-height:1.4}
</style></head><body>
<div class="card">
<h1>Private Market Map Demo</h1>
<p class="sub">Private independent prototype. Enter the access password to continue.</p>
<p class="err" id="err"></p>
<label for="pw">Password</label>
<input id="pw" type="password" autocomplete="current-password"/>
<button id="btn">Unlock</button>
<p class="foot">Private independent prototype.<br/>Not affiliated with or endorsed by Pretoria Boeremark.</p>
</div>
<script>
document.getElementById('btn').addEventListener('click', go);
document.getElementById('pw').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
function go(){
  var pw = document.getElementById('pw').value;
  fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password: pw})})
    .then(function(r){ if(!r.ok) throw new Error('bad'); location.reload(); })
    .catch(function(){ var e=document.getElementById('err'); e.textContent='Incorrect password. Please try again.'; e.style.display='block'; });
}
</script>
</body></html>`;

app.get('/robots.txt', () => new Response('User-agent: *\nDisallow: /\n', {
  headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex, nofollow' },
}));

app.notFound(async (c) => {
  const accept = c.req.header('accept') ?? '';
  const isHtml = c.req.method === 'GET' && accept.includes('text/html');
  const cookies = parseCookies(c.req.header('cookie'));
  const viewer = await verifyToken(c.env.SESSION_SECRET, 'viewer', cookies.bm_session);
  if (!viewer) {
    if (isHtml) {
      return new Response(LOGIN_PAGE, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
        },
      });
    }
    return new Response('unauthorized', { status: 401 });
  }
  const resp = await c.env.ASSETS.fetch(c.req.raw);
  const headers = new Headers(resp.headers);
  headers.set('x-robots-tag', 'noindex, nofollow');
  if (c.req.path.startsWith('/assets/')) {
    headers.set('cache-control', 'public, max-age=31536000, immutable');
  }
  return new Response(resp.body, { status: resp.status, headers });
});

app.onError((err) => {
  console.error('worker error', err);
  return json({ error: 'server_error' }, 500);
});

export default app;
