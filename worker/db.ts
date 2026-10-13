import type {
  AdPricing, Advertisement, Category, MarketData, Product, Special, Stall, Vendor,
} from '../shared/types';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_af TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY, business_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '', gallery TEXT NOT NULL DEFAULT '[]', featured_image TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL DEFAULT 'other', socials TEXT NOT NULL DEFAULT '[]', is_demo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS stalls (
  id TEXT PRIMARY KEY, stall_number TEXT NOT NULL, street_name TEXT NOT NULL DEFAULT '',
  x REAL NOT NULL DEFAULT 0, y REAL NOT NULL DEFAULT 0, width REAL NOT NULL DEFAULT 90,
  height REAL NOT NULL DEFAULT 60, rotation REAL NOT NULL DEFAULT 0,
  vendor_id TEXT, category_id TEXT, status TEXT NOT NULL DEFAULT 'open',
  featured_level TEXT NOT NULL DEFAULT 'free', saturday_special INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', keywords TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS specials (
  id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, stall_id TEXT NOT NULL, title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', normal_price TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL, end_date TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY, tier TEXT NOT NULL, price_zar INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, image TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, category_id TEXT
);
CREATE TABLE IF NOT EXISTS advertisements (
  id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, ref_id TEXT NOT NULL DEFAULT '',
  keyword TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_specials_vendor ON specials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_specials_stall ON specials(stall_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type);
`;

export interface D1Like {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      all<T>(limitOrCols?: unknown, cols?: unknown): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
    all<T>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
  batch(stmts: unknown[]): Promise<unknown[]>;
}

type Row = Record<string, any>;

function j<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function ensureSchema(db: D1Like): Promise<void> {
  for (const stmt of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.prepare(stmt).run();
  }
}

export async function isEmpty(db: D1Like): Promise<boolean> {
  const r = await db.prepare('SELECT COUNT(*) AS c FROM stalls').all<{ c: number }>();
  return (r.results[0]?.c ?? 0) === 0;
}

export async function loadMarketData(db: D1Like): Promise<MarketData> {
  const [cats, vens, prods, stalls, specs, pricing, sponsors, ads] = await Promise.all([
    db.prepare('SELECT * FROM categories ORDER BY sort_order').all<Row>(),
    db.prepare('SELECT * FROM vendors').all<Row>(),
    db.prepare('SELECT * FROM products').all<Row>(),
    db.prepare('SELECT * FROM stalls ORDER BY sort_order, stall_number').all<Row>(),
    db.prepare('SELECT * FROM specials').all<Row>(),
    db.prepare('SELECT * FROM pricing').all<Row>(),
    db.prepare('SELECT * FROM sponsors').all<Row>(),
    db.prepare('SELECT * FROM advertisements').all<Row>(),
  ]);

  const categories: Category[] = cats.results.map((r: Row) => ({
    id: r.id, nameEn: r.name_en, nameAf: r.name_af, icon: r.icon, sortOrder: r.sort_order,
  }));
  const vendors: Vendor[] = vens.results.map((r: Row) => ({
    id: r.id, businessName: r.business_name, description: r.description, phone: r.phone,
    whatsapp: r.whatsapp, website: r.website, logo: r.logo,
    gallery: j<Vendor['gallery']>(r.gallery, [] as unknown as Vendor['gallery']),
    featuredImage: r.featured_image, categoryId: r.category_id,
    socials: j<Vendor['socials']>(r.socials, [] as unknown as Vendor['socials']),
    isDemo: !!r.is_demo,
  }));
  const products: Product[] = prods.results.map((r: Row) => ({
    id: r.id, vendorId: r.vendor_id, name: r.name, description: r.description, price: r.price, keywords: r.keywords,
  }));
  const stallRows: Stall[] = stalls.results.map((r: Row) => ({
    id: r.id, stallNumber: r.stall_number, streetName: r.street_name, x: r.x, y: r.y,
    width: r.width, height: r.height, rotation: r.rotation, vendorId: r.vendor_id,
    categoryId: r.category_id, status: r.status, featuredLevel: r.featured_level,
    saturdaySpecial: !!r.saturday_special, sortOrder: r.sort_order,
  }));
  const specials: Special[] = specs.results.map((r: Row) => ({
    id: r.id, vendorId: r.vendor_id, stallId: r.stall_id, title: r.title, description: r.description,
    price: r.price, normalPrice: r.normal_price, image: r.image, startDate: r.start_date,
    endDate: r.end_date, active: !!r.active,
  }));
  const pricingRows: AdPricing[] = pricing.results.map((r: Row) => ({
    id: r.id, tier: r.tier, priceZar: r.price_zar,
    features: j<AdPricing['features']>(r.features, [] as unknown as AdPricing['features']), active: !!r.active,
  }));
  const sponsorRows = sponsors.results.map((r: Row) => ({
    id: r.id, name: r.name, type: r.type as 'category' | 'map', image: r.image, url: r.url,
    active: !!r.active, categoryId: r.category_id as string | null,
  }));
  const advertisements: Advertisement[] = ads.results.map((r: Row) => ({
    id: r.id, vendorId: r.vendor_id, type: r.type, status: r.status, startDate: r.start_date, endDate: r.end_date,
  }));

  return { categories, vendors, products, stalls: stallRows, specials, pricing: pricingRows, sponsors: sponsorRows, advertisements };
}

export async function seedIfEmpty(db: D1Like, seed: MarketData): Promise<void> {
  if (!(await isEmpty(db))) return;
  const stmts: unknown[] = [];
  for (const c of seed.categories) {
    stmts.push(db.prepare('INSERT INTO categories (id,name_en,name_af,icon,sort_order) VALUES (?,?,?,?,?)')
      .bind(c.id, c.nameEn, c.nameAf, c.icon, c.sortOrder));
  }
  for (const v of seed.vendors) {
    stmts.push(db.prepare('INSERT INTO vendors (id,business_name,description,phone,whatsapp,website,logo,gallery,featured_image,category_id,socials,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(v.id, v.businessName, v.description, v.phone, v.whatsapp, v.website, v.logo,
        JSON.stringify(v.gallery), v.featuredImage, v.categoryId, JSON.stringify(v.socials), v.isDemo ? 1 : 0));
  }
  for (const p of seed.products) {
    stmts.push(db.prepare('INSERT INTO products (id,vendor_id,name,description,price,keywords) VALUES (?,?,?,?,?,?)')
      .bind(p.id, p.vendorId, p.name, p.description, p.price, p.keywords));
  }
  for (const s of seed.stalls) {
    stmts.push(db.prepare('INSERT INTO stalls (id,stall_number,street_name,x,y,width,height,rotation,vendor_id,category_id,status,featured_level,saturday_special,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(s.id, s.stallNumber, s.streetName, s.x, s.y, s.width, s.height, s.rotation,
        s.vendorId, s.categoryId, s.status, s.featuredLevel, s.saturdaySpecial ? 1 : 0, s.sortOrder));
  }
  for (const sp of seed.specials) {
    stmts.push(db.prepare('INSERT INTO specials (id,vendor_id,stall_id,title,description,price,normal_price,image,start_date,end_date,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(sp.id, sp.vendorId, sp.stallId, sp.title, sp.description, sp.price, sp.normalPrice,
        sp.image, sp.startDate, sp.endDate, sp.active ? 1 : 0));
  }
  for (const pr of seed.pricing) {
    stmts.push(db.prepare('INSERT INTO pricing (id,tier,price_zar,features,active) VALUES (?,?,?,?,?)')
      .bind(pr.id, pr.tier, pr.priceZar, JSON.stringify(pr.features), pr.active ? 1 : 0));
  }
  for (const s of seed.sponsors) {
    stmts.push(db.prepare('INSERT INTO sponsors (id,name,type,image,url,active,category_id) VALUES (?,?,?,?,?,?,?)')
      .bind(s.id, s.name, s.type, s.image, s.url, s.active ? 1 : 0, s.categoryId));
  }
  for (const a of seed.advertisements) {
    stmts.push(db.prepare('INSERT INTO advertisements (id,vendor_id,type,status,start_date,end_date) VALUES (?,?,?,?,?,?)')
      .bind(a.id, a.vendorId, a.type, a.status, a.startDate, a.endDate));
  }
  await db.batch(stmts);
}
