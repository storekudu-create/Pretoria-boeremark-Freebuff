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

interface StallSeed {
  number: string;
  streetName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

function range(start: number, end: number): string[] {
  const step = start <= end ? 1 : -1;
  const out: string[] = [];
  for (let n = start; step > 0 ? n <= end : n >= end; n += step) out.push(String(n));
  return out;
}

function addRun(
  stalls: StallSeed[],
  numbers: string[],
  streetName: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number,
  rotation = 0,
): void {
  const count = Math.max(numbers.length - 1, 1);
  numbers.forEach((number, i) => {
    const t = i / count;
    stalls.push({
      number,
      streetName,
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
      width,
      height,
      rotation,
    });
  });
}

function buildBoeremarkLayout(): StallSeed[] {
  const stalls: StallSeed[] = [];

  // Outer perimeter rows traced from the supplied Boeremark reference image.
  addRun(stalls, ['101', '104', '105', '107', '109', '111', '113', '115', '116A', '117', '118', '119'], 'Wilgerlaan', 170, 72, 735, 58, 48, 28, -2);
  addRun(stalls, range(121, 134), 'Wilgerlaan', 778, 76, 830, 420, 38, 28, 86);
  addRun(stalls, ['135', '135A', ...range(136, 141), '141A', ...range(142, 155), '156', '158'], 'Wilgerlaan', 842, 448, 748, 1110, 40, 28, 82);
  addRun(stalls, ['159', '160', '161', '162', '163', '164', '165', '166', '169', '170', '171A'], 'Wilgerlaan', 708, 1160, 470, 1320, 46, 28, -28);
  addRun(stalls, ['172', '175', '177', '179', '179C', '179E', '179G'], 'Wilgerlaan', 430, 1345, 78, 1330, 56, 30, -2);
  addRun(stalls, ['180A', ...range(180, 192), '192A', '192B', '192C', '192D'], 'Olierlaan', 66, 1208, 70, 820, 40, 28, -88);
  addRun(stalls, ['420L', '420L', '420J', '420H', '420G', '420F', '420E', '420D', '420C', '420B', '420A', ...range(420, 432)], 'Olierlaan', 98, 792, 116, 170, 40, 28, -88);

  // Upper-left and upper-middle internal blocks.
  addRun(stalls, range(404, 419), 'Wildeperskelaan', 198, 132, 198, 610, 44, 28, -90);
  addRun(stalls, ['383', '384', '385', '380', '387', '388', '390', '391', '392', '393', '394', '395', '396A'], 'Geelhoutlaan', 292, 196, 322, 606, 44, 28, -88);
  addRun(stalls, ['361C', '361B'], 'Wilgerlaan', 270, 116, 386, 112, 72, 30, 0);
  addRun(stalls, ['382', '381', '380', '379', '378', '377', '376', '375', '374', '373', '372'], 'Geelhoutlaan', 375, 224, 386, 565, 44, 28, -88);
  addRun(stalls, ['361', '362', '363', '366', '368', '369', '370', '371'], 'Kamperboomlaan', 432, 224, 445, 565, 44, 28, -88);
  addRun(stalls, ['358B', '357', '356', '355', '354', '353', '352', '351', '350', '349', '348', '347'], 'Kamperboomlaan', 502, 142, 510, 545, 54, 30, -88);
  addRun(stalls, ['337A', '337', '338', '339', '340', '341', '342', '343', '344', '345', '346'], 'Vaderlandswilglaan', 580, 222, 582, 542, 44, 28, -90);
  addRun(stalls, ['336G', '336C', '336B', '336A', '335', '334', '333', '332', '331', '329', '327'], 'Vaderlandswilglaan', 682, 138, 714, 535, 58, 30, -88);

  // Blocks around Kantferlaan, Spiel area and Groot Kraal.
  addRun(stalls, ['323', '325'], 'Kantferlaan', 648, 586, 718, 574, 50, 30, -8);
  addRun(stalls, ['317', '318'], 'Wilgerlaan', 780, 600, 792, 660, 48, 30, -86);
  addRun(stalls, ['316', '307', '308', '309'], 'Wilgerlaan', 805, 710, 822, 835, 44, 30, -84);
  addRun(stalls, ['433', '434'], 'Olierlaan', 194, 660, 194, 725, 58, 36, -90);
  addRun(stalls, ['454', '453', '452', '451', '450'], 'Valleiprunuslaan', 310, 636, 330, 760, 52, 30, -80);
  addRun(stalls, ['439', '440', '442', '443', '444'], 'Valleiprunuslaan', 122, 870, 190, 954, 46, 30, -4);
  addRun(stalls, ['449', '448'], 'Valleiprunuslaan', 330, 835, 330, 900, 58, 36, -90);
  addRun(stalls, ['293', '289', '287', '296'], 'Wildehondlaan', 748, 860, 858, 825, 48, 28, -12);

  // Lower-left market blocks.
  addRun(stalls, ['193', '194', '195', '196', '197', '198', '199', '200', '201', '202', '203', '203A', '204'], 'Wissinkhoutlaan', 122, 1015, 128, 1235, 42, 28, -88);
  addRun(stalls, ['216', '215', '214', '213', '212', '211', '210', '209', '208', '207', '206', '205'], 'Wissinkhoutlaan', 182, 1014, 188, 1234, 42, 28, -88);
  addRun(stalls, range(212, 229), 'Vaalpruimlaan', 260, 1000, 260, 1280, 42, 28, -90);
  addRun(stalls, ['244', '243', '242', '241', '240', '239', '238', '237', '236', '235', '234', '233', '233A', '230'], 'Papierbaailaan', 335, 1000, 330, 1285, 44, 28, -90);
  addRun(stalls, ['245', '223', '519', '512', '515', '501', '500B', '231', '232'], 'Papierbaailaan', 388, 1000, 408, 1285, 44, 28, -90);

  // Lower-middle and lower-right internal blocks.
  addRun(stalls, ['525', '527', '529', '531', '535', '537', '539', '541', '545', '549', '551', '552'], 'Karoblaan', 500, 930, 510, 1240, 48, 28, -88);
  addRun(stalls, ['524', '526', '528', '530', '534', '536', '538', '540', '543', '544', '548', '550', '552A'], 'Karoblaan', 555, 930, 565, 1245, 48, 28, -88);
  addRun(stalls, ['522', '520', '518', '516', '514', '510', '508', '506', '504', '502', '500', '500A'], 'Luiperdboomlaan', 638, 930, 650, 1235, 46, 28, -88);
  addRun(stalls, ['523', '521', '519', '517', '515', '510', '509', '505', '503', '501'], 'Luiperdboomlaan', 690, 930, 700, 1185, 46, 28, -88);
  addRun(stalls, ['267', '266', '265', '270', '271', '272', '273', '274', '275', '276', '277', '278', '279', '280', '257', '258'], 'Luiperdboomlaan', 730, 910, 760, 1135, 42, 28, -86);
  addRun(stalls, ['286', '286A', '285', '282', '281', '281A'], 'Wilgerlaan', 875, 920, 822, 1115, 52, 30, -78);

  return stalls;
}

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

  const layout = buildBoeremarkLayout();
  layout.forEach((stallSeed, i) => {
    const row = VENDOR_ROWS[i % VENDOR_ROWS.length];
    const number = stallSeed.number;
    const stallId = `stall-${number}-${i}`;

    if (!row) {
      stalls.push({
        id: stallId, stallNumber: number, streetName: stallSeed.streetName,
        x: stallSeed.x, y: stallSeed.y, width: stallSeed.width, height: stallSeed.height, rotation: stallSeed.rotation,
        vendorId: null, categoryId: null, status: 'vacant', featuredLevel: 'free',
        saturdaySpecial: false, sortOrder: i,
      });
      return;
    }

    const vendorId = `vendor-${number}`;
    vendors.push({
      id: vendorId,
      businessName: `${row.name} (${number})`,
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
      id: stallId, stallNumber: number, streetName: stallSeed.streetName,
      x: stallSeed.x, y: stallSeed.y, width: stallSeed.width, height: stallSeed.height, rotation: stallSeed.rotation,
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
