export type FeaturedLevel = 'free' | 'featured' | 'promoted' | 'premium';
export type StallStatus = 'open' | 'vacant' | 'closed';
export type AdTier =
  | FeaturedLevel
  | 'saturday_special'
  | 'category_sponsor'
  | 'map_sponsor';

export interface SocialLink {
  label: string;
  url: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameAf: string;
  icon: string;
  sortOrder: number;
}

export interface Vendor {
  id: string;
  businessName: string;
  description: string;
  phone: string;
  whatsapp: string;
  website: string;
  logo: string;
  gallery: string[];
  featuredImage: string;
  categoryId: string;
  socials: SocialLink[];
  isDemo: boolean;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: string;
  keywords: string;
}

export interface Stall {
  id: string;
  stallNumber: string;
  streetName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  vendorId: string | null;
  categoryId: string | null;
  status: StallStatus;
  featuredLevel: FeaturedLevel;
  saturdaySpecial: boolean;
  sortOrder: number;
}

export interface Special {
  id: string;
  vendorId: string;
  stallId: string;
  title: string;
  description: string;
  price: string;
  normalPrice: string;
  image: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface AdPricing {
  id: string;
  tier: AdTier;
  priceZar: number;
  features: string[];
  active: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  type: 'category' | 'map';
  image: string;
  url: string;
  active: boolean;
  categoryId: string | null;
}

export interface Advertisement {
  id: string;
  vendorId: string;
  type: AdTier;
  status: 'active' | 'paused';
  startDate: string;
  endDate: string;
}

export interface MarketData {
  categories: Category[];
  vendors: Vendor[];
  products: Product[];
  stalls: Stall[];
  specials: Special[];
  pricing: AdPricing[];
  sponsors: Sponsor[];
  advertisements: Advertisement[];
}

export type AnalyticsEventType =
  | 'search'
  | 'profile_view'
  | 'stall_locate'
  | 'whatsapp_click'
  | 'call_click'
  | 'category_click'
  | 'special_view'
  | 'pwa_install';

export interface AnalyticsEvent {
  id: number;
  type: AnalyticsEventType;
  refId: string;
  keyword: string;
  createdAt: string;
}
