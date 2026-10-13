import type { Category, MarketData, Product, Stall, Vendor } from './types';

export interface SearchMatch {
  stall: Stall;
  vendor: Vendor | null;
  category: Category | null;
  matchedProducts: Product[];
  score: number;
  reasons: string[];
}

const LEVEL_SCORE: Record<string, number> = {
  premium: 30,
  promoted: 20,
  featured: 10,
  free: 0,
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function searchMarket(
  data: MarketData,
  rawQuery: string,
  categoryId?: string | null,
): SearchMatch[] {
  const q = norm(rawQuery.trim());
  const tokens = q.split(/\s+/).filter(Boolean);
  const vendorById = new Map(data.vendors.map((v) => [v.id, v]));
  const categoryById = new Map(data.categories.map((c) => [c.id, c]));
  const productsByVendor = new Map<string, Product[]>();
  for (const p of data.products) {
    const list = productsByVendor.get(p.vendorId) ?? [];
    list.push(p);
    productsByVendor.set(p.vendorId, list);
  }

  const results: SearchMatch[] = [];

  for (const stall of data.stalls) {
    const vendor = stall.vendorId ? (vendorById.get(stall.vendorId) ?? null) : null;
    const category = vendor ? (categoryById.get(vendor.categoryId) ?? null) : null;

    if (categoryId && vendor?.categoryId !== categoryId) continue;

    if (!tokens.length) {
      results.push({ stall, vendor, category, matchedProducts: [], score: LEVEL_SCORE[stall.featuredLevel] ?? 0, reasons: [] });
      continue;
    }

    let score = 0;
    const reasons: string[] = [];
    const matchedProducts: Product[] = [];

    const stallNum = norm(stall.stallNumber);
    if (tokens.some((t) => stallNum === t || stallNum === t.replace(/^stall[- ]?/, ''))) {
      score += 1000;
      reasons.push('stall_number');
    } else if (tokens.some((t) => stallNum.startsWith(t) && t.length >= 2)) {
      score += 400;
      reasons.push('stall_number_partial');
    }

    if (vendor) {
      const vName = norm(vendor.businessName);
      const vDesc = norm(vendor.description);
      const vStreet = norm(stall.streetName);
      const catName = category ? norm(`${category.nameEn} ${category.nameAf}`) : '';
      for (const t of tokens) {
        if (vName.includes(t)) {
          score += vName.startsWith(t) ? 150 : 90;
          if (!reasons.includes('vendor')) reasons.push('vendor');
        }
        if (vDesc.includes(t)) {
          score += 20;
          if (!reasons.includes('description')) reasons.push('description');
        }
        if (vStreet.includes(t)) {
          score += 60;
          if (!reasons.includes('street')) reasons.push('street');
        }
        if (catName.includes(t)) {
          score += 40;
          if (!reasons.includes('category')) reasons.push('category');
        }
      }
      for (const p of productsByVendor.get(vendor.id) ?? []) {
        const pName = norm(p.name);
        const pKeys = norm(`${p.keywords} ${p.description}`);
        let hit = 0;
        for (const t of tokens) {
          if (pName.includes(t)) hit += 55;
          else if (pKeys.includes(t)) hit += 35;
        }
        if (hit > 0) {
          score += hit;
          matchedProducts.push(p);
          if (!reasons.includes('product')) reasons.push('product');
        }
      }
    }

    if (score > 0) {
      score += LEVEL_SCORE[stall.featuredLevel] ?? 0;
      if (stall.saturdaySpecial) score += 5;
      results.push({ stall, vendor, category, matchedProducts, score, reasons });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const an = parseInt(a.stall.stallNumber, 10) || 0;
    const bn = parseInt(b.stall.stallNumber, 10) || 0;
    return an - bn;
  });
  return results;
}
