import type {
  AdPricing,
  Advertisement,
  Category,
  MarketData,
  Product,
  Special,
  Stall,
  Vendor,
} from './types';
import { DEMO_CATEGORIES } from './categories';

const XS = [60, 160, 260, 360, 550, 650, 750, 850];
const ROWS_Y = [90, 190, 380, 480];
const STALL_W = 90;
const STALL_H = 60;

function svgPlaceholder(label: string, bg: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">` +
    `<rect width="240" height="160" rx="12" fill="${bg}"/>` +
    `<rect x="20" y="96" width="200" height="10" rx="5" fill="rgba(255,255,255,0.35)"/>` +
    `<rect x="20" y="116" width="140" height="10" rx="5" fill="rgba(255,255,255,0.22)"/>` +
    `<text x="120" y="70" font-family="sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface VendorSeed {
  name: string;
  category: string;
  desc: string;
  products: Array<[string, string, string]>; // name, price, keywords
  level?: 'featured' | 'promoted' | 'premium';
  status?: 'open' | 'closed';
  special?: 'active' | 'expired' | 'scheduled' | 'inactive';
  specialTitle?: string;
  specialDesc?: string;
  specialPrice?: string;
  specialNormal?: string;
}

// All businesses below are fictional DEMO data.
const VENDOR_ROWS: Array<VendorSeed | null> = [
  { name: 'Karoo Kraal Biltong', category: 'meat', desc: 'Family biltong recipes from the Karoo. Demo profile.', products: [['Biltong', 'R180/kg', 'biltong dry wors beef'], ['Droëwors', 'R160/kg', 'droewors droë wors dried sausage'], ['Boerewors', 'R120/kg', 'boerewors wors sausage grill'], ['Lamb chops', 'R150/kg', 'lamb chops meat']], level: 'premium', special: 'active', specialTitle: 'Biltong family pack', specialDesc: '3kg biltong bundle, while stocks last (demo).', specialNormal: 'R540', specialPrice: 'R450' },
  { name: 'Sonblom Bakkerij', category: 'baked-goods', desc: 'Sunrise breads, cakes and koeksisters. Demo profile.', products: [['Bread loaves', 'R35', 'bread loaf sourdough'], ['Rusks', 'R60', 'rusks beskuit buttermilk'], ['Koeksisters', 'R12', 'koeksister syrup dough']], level: 'featured' },
  { name: 'Moreleta Groente & Vrugte', category: 'fresh-produce', desc: 'Seasonal vegetables and fruit boxes. Demo profile.', products: [['Veg box', 'R99', 'vegetables veg box greens'], ['Apples', 'R30/kg', 'apples fruit'], ['Onions', 'R20/kg', 'onions vegetables']], level: 'promoted', special: 'active', specialTitle: 'Veg box special', specialDesc: 'Large seasonal veg box (demo).', specialNormal: 'R120', specialPrice: 'R99' },
  { name: 'Volmaan Koffie Branders', category: 'coffee', desc: 'Small-batch coffee roasting. Demo profile.', products: [['Espresso beans 500g', 'R120', 'coffee beans espresso roast'], ['Filter grind', 'R95', 'filter coffee ground'], ['Rooibos latte', 'R35', 'rooibos latte tea drink']], level: 'featured' },
  { name: 'Saad & Spruit Kwekery', category: 'plants', desc: 'Seedlings, herbs and succulents. Demo profile.', products: [['Herb seedlings', 'R25', 'seedlings herbs basil mint'], ['Succulents', 'R40', 'succulents plants'], ['Potting mix', 'R55', 'potting soil mix compost']], level: 'premium' },
  { name: 'Denim & Draf Mode', category: 'clothing', desc: 'Casual wear for the whole family. Demo profile.', products: [['Jeans', 'R250', 'jeans denim clothing clothes'], ['Summer dress', 'R180', 'dress clothing clothes'], ['Kids tees', 'R70', 'kids shirts clothes clothing']] },
  { name: 'Handwerk Huisie', category: 'crafts', desc: 'Handmade candles, crochet and ceramics. Demo profile.', products: [['Soy candles', 'R80', 'candles crafts'], ['Crochet blankets', 'R350', 'crochet blanket crafts'], ['Ceramic mugs', 'R90', 'ceramic mug pottery crafts']] },
  { name: 'Goud & Glans Juwele', category: 'jewellery', desc: 'Affordable silver and beaded jewellery. Demo profile.', products: [['Silver rings', 'R220', 'silver rings jewellery'], ['Beaded necklaces', 'R150', 'beads necklace jewellery']], level: 'promoted' },

  { name: 'Biltong Barak', category: 'meat', desc: 'Chilli biltong and biltong crisps. Demo profile.', products: [['Chilli biltong', 'R190/kg', 'biltong chilli spicy'], ['Biltong crisps', 'R45', 'biltong crisps snack'], ['Droëwors packs', 'R150', 'droewors dried sausage']], level: 'featured' },
  { name: 'Pannekoek Padstal', category: 'food', desc: 'Hot pancakes and vetkoek straight off the pan. Demo profile.', products: [['Pancakes', 'R15', 'pancakes pannekoek syrup'], ['Vetkoek & mince', 'R30', 'vetkoek mince'], ['Magwenya', 'R10', 'magwenya fatcake']], level: 'promoted', special: 'active', specialTitle: 'Pancake 3-for-2', specialDesc: 'Buy two pancakes, get one free (demo).', specialNormal: 'R45', specialPrice: 'R30' },
  { name: 'Plaas Tafel Eiers', category: 'fresh-produce', desc: 'Free-range eggs, duck eggs and raw honey. Demo profile.', products: [['Free-range eggs', 'R45/dozen', 'eggs free range dozen'], ['Duck eggs', 'R60/dozen', 'duck eggs'], ['Raw honey', 'R75', 'honey raw']], level: 'featured', special: 'expired', specialTitle: 'Egg dozen deal', specialDesc: 'Expired demo special.', specialNormal: 'R55', specialPrice: 'R45' },
  { name: 'Espresso Eiland', category: 'coffee', desc: 'Barista coffee and bakes to go. Demo profile.', products: [['Flat white', 'R32', 'coffee flat white espresso'], ['Cold brew', 'R38', 'cold brew coffee'], ['Blueberry muffin', 'R28', 'muffin baked coffee']], },
  { name: 'Blomme van Moreleta', category: 'plants', desc: 'Cut flowers and potted plants. Demo profile.', products: [['Cut flowers bunch', 'R60', 'flowers cut fresh'], ['Potted plants', 'R90', 'plants potted pot'], ['Bulbs', 'R35', 'bulbs plants']], special: 'scheduled', specialTitle: 'Flower bunch special', specialDesc: 'Upcoming demo special.', specialNormal: 'R80', specialPrice: 'R60' },
  { name: 'Beskuit & Co', category: 'baked-goods', desc: 'Twice-baked rusks in every flavour. Demo profile.', products: [['Buttermilk rusks', 'R55', 'rusks buttermilk beskuit'], ['Ginger biscuits', 'R40', 'biscuits ginger']] },
  { name: 'Selfoon Herstel & Sleutels', category: 'services', desc: 'Screen repairs and key cutting. Demo profile.', products: [['Screen replacement', 'R450', 'phone screen repair'], ['Key cutting', 'R60', 'keys cutting remote']] },
  { name: 'Ou Boeke & Antiek', category: 'other', desc: 'Second-hand books, vinyl and curios. Demo profile.', products: [['Paperbacks', 'R30', 'books paperback'], ['Vinyl records', 'R80', 'vinyl records music'], ['Curios', 'R50', 'curios antiek antique']] },

  { name: 'Skaapvleis & Speserye', category: 'meat', desc: 'Lamb cuts, biltong and house spice blends. Demo profile.', products: [['Lamb legs', 'R160/kg', 'lamb meat leg'], ['Biltong bites', 'R95', 'biltong snack bites'], ['Spice blend', 'R45', 'spice rub seasoning'], ['Chicken portions', 'R90/kg', 'chicken meat']] },
  { name: 'Kaas & Konfytmaker', category: 'food', desc: 'Farmstyle cheese, chutney and preserves. Demo profile.', products: [['Mature cheddar', 'R120/kg', 'cheese cheddar'], ['Green chutney', 'R35', 'chutney konfyt'], ['Apricot jam', 'R40', 'jam apricot preserve']], level: 'promoted', special: 'inactive', specialTitle: 'Cheese board deal', specialDesc: 'Deactivated demo special.', specialNormal: 'R150', specialPrice: 'R120' },
  { name: 'Kruie & Groente Tuin', category: 'fresh-produce', desc: 'Leafy greens and fresh herbs. Demo profile.', products: [['Spinach bunch', 'R15', 'spinach vegetables greens'], ['Beetroot', 'R20', 'beetroot vegetables'], ['Parsley & thyme', 'R12', 'herbs parsley thyme']] },
  { name: 'Koffie Kar', category: 'coffee', desc: 'Quick takeaway coffee cart. Demo profile.', products: [['Takeaway coffee', 'R28', 'coffee takeaway cappuccino'], ['Choco mocha', 'R35', 'mocha chocolate coffee']] },
  { name: 'Kaktus & Kurk', category: 'plants', desc: 'Cacti, bonsai and cork bark displays. Demo profile.', products: [['Cacti pots', 'R70', 'cactus cacti plants'], ['Bonsai starter', 'R150', 'bonsai tree plants'], ['Cork bark', 'R45', 'cork bark terrarium']], level: 'featured' },
  { name: 'Stof & Stiksels', category: 'clothing', desc: 'Fabric by the metre and alterations. Demo profile.', products: [['Fabric metre', 'R60', 'fabric cloth material'], ['Curtains', 'R450', 'curtains fabric home'], ['Alterations', 'R80', 'alterations sewing repair']] },
  { name: 'Hout & Draad Werkswinkel', category: 'crafts', desc: 'Woodwork and wire art pieces. Demo profile.', products: [['Wooden bowls', 'R180', 'wood bowl turned'], ['Wire animals', 'R120', 'wire art crafts sculpture']] },
  { name: 'Tafel & Teeklere', category: 'home', desc: 'Table linen and handmade ceramics. Demo profile.', products: [['Table runner', 'R150', 'table linen runner'], ['Ceramic bowls', 'R110', 'ceramic bowl pottery home']] },

  { name: 'Gebraaivleis Grill', category: 'food', desc: 'Wors rolls and braai packs to go. Demo profile.', products: [['Wors roll', 'R40', 'wors roll boerewors bun'], ['Braai pack', 'R250', 'braai pack meat platter'], ['Chicken wings', 'R80', 'chicken wings grill']], special: 'active', specialTitle: 'Wors roll deal', specialDesc: 'Two wors rolls and chips (demo).', specialNormal: 'R95', specialPrice: 'R75' },
  { name: 'Brood & Botter Bakery', category: 'baked-goods', desc: 'Sourdough, rolls and farm butter. Demo profile.', products: [['Sourdough', 'R50', 'sourdough bread'], ['Rolls 6-pack', 'R30', 'rolls bread buns'], ['Farm butter', 'R45', 'butter farm']], level: 'featured' },
  { name: 'Vrugte Mark', category: 'fresh-produce', desc: 'Seasonal fruit and dried fruit. Demo profile.', products: [['Seasonal fruit box', 'R110', 'fruit box seasonal'], ['Dried mango', 'R50', 'dried mango fruit snack']] },
  { name: 'Klei & Klein Juwele', category: 'jewellery', desc: 'Polymer clay earrings and charms. Demo profile.', products: [['Clay earrings', 'R80', 'earrings clay jewellery'], ['Charms', 'R40', 'charms jewellery']] },
  { name: 'Framing & Fotos', category: 'services', desc: 'Photo framing and small prints. Demo profile.', products: [['A3 framing', 'R250', 'framing photo frame'], ['Photo prints', 'R15', 'prints photos']] },
  null, // vacant
  null, // vacant
  { name: 'Slush & Snow', category: 'food', desc: 'Ice cream and slush drinks. Demo profile.', products: [['Ice cream cone', 'R25', 'ice cream slush'], ['Slush drink', 'R20', 'slush drink cold']], status: 'closed' },
];

function addDays(base: Date, days: number): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildSeedData(now: Date = new Date()): MarketData {
  const categories: Category[] = DEMO_CATEGORIES.map((c) => ({ ...c }));
  const catColor: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.id, svgPlaceholder(c.nameEn.slice(0, 2).toUpperCase(), '#3f6b43')]),
  );

  const vendors: Vendor[] = [];
  const products: Product[] = [];
  const stalls: Stall[] = [];
  const specials: Special[] = [];
  const advertisements: Advertisement[] = [];

  VENDOR_ROWS.forEach((row, i) => {
    const rowIdx = Math.floor(i / XS.length);
    const colIdx = i % XS.length;
    const number = String((rowIdx + 1) * 100 + (colIdx + 1));
    const streetName = ['Moreleta St', 'Olienhoutlaan', 'Olienhoutlaan', 'Wilgerlaan'][rowIdx];
    const stallId = `stall-${number}`;

    if (!row) {
      stalls.push({
        id: stallId, stallNumber: number, streetName,
        x: XS[colIdx], y: ROWS_Y[rowIdx], width: STALL_W, height: STALL_H, rotation: 0,
        vendorId: null, categoryId: null, status: 'vacant', featuredLevel: 'free',
        saturdaySpecial: false, sortOrder: i,
      });
      return;
    }

    const vendorId = `vendor-${number}`;
    vendors.push({
      id: vendorId,
      businessName: row.name,
      description: row.desc,
      phone: `072 000 ${number.padStart(4, '0')}`,
      whatsapp: `072 000 ${number.padStart(4, '0')}`,
      website: '',
      logo: svgPlaceholder(row.name.slice(0, 2).toUpperCase(), '#5b7f52'),
      gallery: [catColor[row.category], svgPlaceholder('DEMO', '#7a6a4f')],
      featuredImage: catColor[row.category],
      categoryId: row.category,
      socials: [],
      isDemo: true,
    });

    row.products.forEach((p, pi) => {
      products.push({
        id: `prod-${number}-${pi}`,
        vendorId,
        name: p[0],
        description: '',
        price: p[1],
        keywords: p[2],
      });
    });

    stalls.push({
      id: stallId, stallNumber: number, streetName,
      x: XS[colIdx], y: ROWS_Y[rowIdx], width: STALL_W, height: STALL_H, rotation: 0,
      vendorId, categoryId: row.category,
      status: row.status === 'closed' ? 'closed' : 'open',
      featuredLevel: row.level ?? 'free',
      saturdaySpecial: row.special === 'active',
      sortOrder: i,
    });

    if (row.level) {
      advertisements.push({
        id: `ad-${number}`,
        vendorId,
        type: row.level,
        status: 'active',
        startDate: addDays(now, -30),
        endDate: addDays(now, 60),
      });
    }

    if (row.special) {
      const ranges: Record<string, [string, string, boolean]> = {
        active: [addDays(now, -1), addDays(now, 5), true],
        expired: [addDays(now, -10), addDays(now, -3), true],
        scheduled: [addDays(now, 3), addDays(now, 10), true],
        inactive: [addDays(now, -1), addDays(now, 5), false],
      };
      const [startDate, endDate, active] = ranges[row.special];
      specials.push({
        id: `special-${number}`,
        vendorId,
        stallId,
        title: row.specialTitle ?? `${row.name} special`,
        description: row.specialDesc ?? '',
        price: row.specialPrice ?? '',
        normalPrice: row.specialNormal ?? '',
        image: catColor[row.category],
        startDate,
        endDate,
        active,
      });
    }
  });

  const pricing: AdPricing[] = [
    { id: 'price-free', tier: 'free', priceZar: 0, features: ['Stall number', 'Business name', 'Basic category', 'Basic product list'], active: true },
    { id: 'price-featured', tier: 'featured', priceZar: 50, features: ['Expanded profile', 'Business logo', 'Contact buttons', 'Photo', 'Priority listing'], active: true },
    { id: 'price-promoted', tier: 'promoted', priceZar: 100, features: ['Higher in search results', 'Special badge', 'Specials section'], active: true },
    { id: 'price-premium', tier: 'premium', priceZar: 200, features: ['Enhanced map marker', 'Homepage feature area', 'Larger vendor card', 'Multiple images'], active: true },
    { id: 'price-saturday', tier: 'saturday_special', priceZar: 30, features: ['Saturday special listing', 'Special indicator on map'], active: true },
    { id: 'price-category', tier: 'category_sponsor', priceZar: 750, features: ['Sponsor label within one category'], active: true },
    { id: 'price-map', tier: 'map_sponsor', priceZar: 2000, features: ['Subtle sponsor placement near the map'], active: true },
  ];

  const sponsors = [
    { id: 'sponsor-green', name: 'Green Fingers Demo Sponsor', type: 'category' as const, image: catColor['plants'], url: '', active: true, categoryId: 'plants' },
    { id: 'sponsor-map', name: 'Main Map Demo Sponsor', type: 'map' as const, image: catColor['food'], url: '', active: true, categoryId: null },
    { id: 'sponsor-off', name: 'Inactive Demo Sponsor', type: 'category' as const, image: catColor['home'], url: '', active: false, categoryId: 'home' },
  ];

  return { categories, vendors, products, stalls, specials, pricing, sponsors, advertisements };
}
