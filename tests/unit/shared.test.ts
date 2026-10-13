import { describe, expect, it } from 'vitest';
import { buildSeedData } from '../../shared/seed';
import { searchMarket } from '../../shared/search';
import { activeSpecials, specialState } from '../../shared/specials';
import { telLink, waDigits, waLink, isValidPhone } from '../../shared/format';

const data = buildSeedData(new Date('2026-10-10T08:00:00'));

describe('seed data', () => {
  it('has at least 25 stalls', () => {
    expect(data.stalls.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique stall numbers and ids', () => {
    const nums = new Set(data.stalls.map((s) => s.stallNumber));
    const ids = new Set(data.stalls.map((s) => s.id));
    expect(nums.size).toBe(data.stalls.length);
    expect(ids.size).toBe(data.stalls.length);
  });

  it('has stalls with vacant status and no vendor', () => {
    const vacant = data.stalls.filter((s) => s.status === 'vacant');
    expect(vacant.length).toBeGreaterThan(0);
    expect(vacant.every((s) => s.vendorId === null)).toBe(true);
  });

  it('references only existing vendors/categories', () => {
    const vendorIds = new Set(data.vendors.map((v) => v.id));
    const catIds = new Set(data.categories.map((c) => c.id));
    for (const s of data.stalls) {
      if (s.vendorId) expect(vendorIds.has(s.vendorId)).toBe(true);
    }
    for (const v of data.vendors) expect(catIds.has(v.categoryId)).toBe(true);
    for (const p of data.products) expect(vendorIds.has(p.vendorId)).toBe(true);
    for (const sp of data.specials) {
      expect(vendorIds.has(sp.vendorId)).toBe(true);
      expect(data.stalls.some((s) => s.id === sp.stallId)).toBe(true);
    }
  });

  it('uses only reference street names', () => {
    const allowed = new Set(['Moreleta St', 'Olienhoutlaan', 'Wilgerlaan']);
    for (const s of data.stalls) expect(allowed.has(s.streetName)).toBe(true);
  });

  it('marks all demo vendors', () => {
    expect(data.vendors.every((v) => v.isDemo)).toBe(true);
  });
});

describe('search', () => {
  it('finds multiple stalls for biltong', () => {
    const r = searchMarket(data, 'biltong');
    expect(r.length).toBeGreaterThanOrEqual(3);
  });

  it('finds stalls by number', () => {
    const r = searchMarket(data, '101');
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].stall.stallNumber).toBe('101');
  });

  it('finds stalls by vendor name', () => {
    const r = searchMarket(data, 'Volmaan');
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].vendor?.businessName).toContain('Volmaan');
  });

  it('finds stalls by product name and keywords', () => {
    expect(searchMarket(data, 'rusks').length).toBeGreaterThanOrEqual(2);
    expect(searchMarket(data, 'koeksister').length).toBeGreaterThanOrEqual(1);
    expect(searchMarket(data, 'plants').length).toBeGreaterThanOrEqual(2);
    expect(searchMarket(data, 'eggs').length).toBeGreaterThanOrEqual(1);
    expect(searchMarket(data, 'coffee').length).toBeGreaterThanOrEqual(3);
  });

  it('matches afrikaans keywords (droëwors)', () => {
    expect(searchMarket(data, 'droëwors').length).toBeGreaterThanOrEqual(1);
    expect(searchMarket(data, 'droewors').length).toBeGreaterThanOrEqual(1);
  });

  it('ranks exact stall number first', () => {
    const r = searchMarket(data, '203');
    expect(r[0].stall.stallNumber).toBe('203');
  });

  it('boosts featured/promoted/premium in ranking', () => {
    const r = searchMarket(data, 'biltong');
    const levels = r.map((m) => m.stall.featuredLevel);
    expect(levels[0]).not.toBe('free');
  });

  it('filters by category', () => {
    const r = searchMarket(data, '', 'coffee');
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r.every((m) => m.vendor?.categoryId === 'coffee')).toBe(true);
  });

  it('returns empty for gibberish', () => {
    expect(searchMarket(data, 'zzzzqqqxxx').length).toBe(0);
  });

  it('returns all stalls on empty query', () => {
    expect(searchMarket(data, '  ').length).toBe(data.stalls.length);
  });
});

describe('specials', () => {
  const now = new Date('2026-10-10T08:00:00');

  it('classifies active/scheduled/expired/inactive', () => {
    const states = data.specials.map((s) => specialState(s, now));
    expect(states).toContain('active');
    expect(states).toContain('expired');
    expect(states).toContain('scheduled');
    expect(states).toContain('inactive');
  });

  it('activeSpecials only returns active', () => {
    const a = activeSpecials(data.specials, now);
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((s) => specialState(s, now) === 'active')).toBe(true);
  });
});

describe('format', () => {
  it('formats local mobile numbers to wa.me', () => {
    expect(waDigits('072 000 0101')).toBe('27720000101');
    expect(waLink('072 000 0101')).toBe('https://wa.me/27720000101');
  });

  it('handles +27 and 27 prefixes', () => {
    expect(waDigits('+27 72 000 0101')).toBe('27720000101');
    expect(waDigits('27720000101')).toBe('27720000101');
  });

  it('builds tel links', () => {
    expect(telLink('072 000 0101')).toBe('tel:0720000101');
    expect(telLink('+27720000101')).toBe('tel:+27720000101');
  });

  it('validates phone length', () => {
    expect(isValidPhone('072 000 0101')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });

  it('empty phone yields empty links', () => {
    expect(waLink('')).toBe('');
    expect(telLink('')).toBe('');
  });
});
