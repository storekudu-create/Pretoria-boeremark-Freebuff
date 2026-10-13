import type { Category } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  'food': '#f59e0b',
  'fresh-produce': '#65a30d',
  'meat': '#dc2626',
  'baked-goods': '#d97706',
  'coffee': '#92400e',
  'plants': '#059669',
  'clothing': '#7c3aed',
  'crafts': '#0891b2',
  'jewellery': '#c026d3',
  'home': '#2563eb',
  'services': '#475569',
  'other': '#6b7280',
};

export function categoryColor(id: string): string {
  return CATEGORY_COLORS[id] ?? '#6b7280';
}

export const DEMO_CATEGORIES: Category[] = [
  { id: 'food', nameEn: 'Food', nameAf: 'Kos', icon: '🍽️', sortOrder: 1 },
  { id: 'fresh-produce', nameEn: 'Fresh Produce', nameAf: 'Vars Produksie', icon: '🥕', sortOrder: 2 },
  { id: 'meat', nameEn: 'Meat', nameAf: 'Vleis', icon: '🥩', sortOrder: 3 },
  { id: 'baked-goods', nameEn: 'Baked Goods', nameAf: 'Bakware', icon: '🥖', sortOrder: 4 },
  { id: 'coffee', nameEn: 'Coffee', nameAf: 'Koffie', icon: '☕', sortOrder: 5 },
  { id: 'plants', nameEn: 'Plants', nameAf: 'Plante', icon: '🪴', sortOrder: 6 },
  { id: 'clothing', nameEn: 'Clothing', nameAf: 'Klere', icon: '👕', sortOrder: 7 },
  { id: 'crafts', nameEn: 'Crafts', nameAf: 'Handwerk', icon: '🧶', sortOrder: 8 },
  { id: 'jewellery', nameEn: 'Jewellery', nameAf: 'Sierade', icon: '💍', sortOrder: 9 },
  { id: 'home', nameEn: 'Home', nameAf: 'Tuis', icon: '🏠', sortOrder: 10 },
  { id: 'services', nameEn: 'Services', nameAf: 'Dienste', icon: '🛠️', sortOrder: 11 },
  { id: 'other', nameEn: 'Other', nameAf: 'Ander', icon: '📦', sortOrder: 12 },
];
