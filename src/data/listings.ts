import { stalls } from "./stalls"

export const listingCategories = [
  "meat",

  "biltong",

  "vegetables",

  "fruit",

  "plants",

  "bakery",

  "coffee",

  "pancakes",

  "crafts",

  "clothing",

  "other",
] as const

export type ListingCategory = typeof listingCategories[number]

export const availabilityStatuses = [
  "open-today",
  "coming-soon",
  "closed",
  "available-to-rent",
] as const

export type AvailabilityStatus = typeof availabilityStatuses[number]

export type TodaySpecial = {
  icon: string
  product: string
  stall: string
}

export const defaultTodaySpecials: TodaySpecial[] = [
  { icon: "🥓", product: "Bacon", stall: "225" },
  { icon: "🥞", product: "Pancake + coffee combo", stall: "403" },
  { icon: "🌱", product: "Vegetable seedlings", stall: "512" },
  { icon: "🥩", product: "Biltong special", stall: "188" },
]

export type StallListing = {
  key: string

  number: string

  businessName: string

  category: ListingCategory

  products: string[]

  whatsapp: string

  freeListing: boolean

  featured: boolean

  saturdaySpecial: boolean

  premium: boolean

  featuredUntil: string

  special: string

  specialToday: boolean

  availabilityStatus: AvailabilityStatus
}

export type ListingsByKey = Record<string, StallListing>

const STORAGE_KEY = "pretoria-boeremark-listings-v2"

const LEGACY_STORAGE_KEY = "pretoria-boeremark-listings-v1"
const SPECIALS_STORAGE_KEY = "pretoria-boeremark-today-specials-v1"
const CHANGE_EVENT = "pretoria-boeremark-listings-changed"
const SPECIALS_CHANGE_EVENT = "pretoria-boeremark-specials-changed"
const DEMO_CATEGORIES: ListingCategory[] = [
  "meat",
  "biltong",
  "vegetables",
  "fruit",
  "plants",
  "bakery",
  "coffee",
  "pancakes",
  "crafts",
  "clothing",
  "other",
]

const demoVendors: Record<ListingCategory, {
  business: string
  products: string[]
  specials: string[]
}> = {
  meat: {
    business: "Karoo Meat Kitchen",
    products: ["Boerewors", "Biltong", "Dry wors"],
    specials: ["Demo wors pack · R120", "Demo biltong pack · R95"],
  },
  biltong: {
    business: "Goldenveld Biltong",
    products: ["Beef biltong", "Chilli bites", "Droëwors"],
    specials: ["Demo biltong bundle · R100", "Demo chilli bites · R75"],
  },
  vegetables: {
    business: "Fresh Patch Produce",
    products: ["Baby marrows", "Spinach", "Farm tomatoes"],
    specials: ["Demo veggie box · R80", "Demo tomato basket · R55"],
  },
  fruit: {
    business: "Sunrise Orchard",
    products: ["Seasonal oranges", "Apples", "Fresh lemons"],
    specials: ["Demo fruit bag · R65", "Demo citrus box · R90"],
  },
  plants: {
    business: "Little Leaf Nursery",
    products: ["Succulents", "Herb seedlings", "Indigenous plants"],
    specials: ["Demo herb trio · R50", "Demo succulent pot · R45"],
  },
  bakery: {
    business: "Oven & Rusks Bakery",
    products: ["Buttermilk rusks", "Koeksisters", "Farm bread"],
    specials: ["Demo rusks bundle · R80", "Demo koeksisters · R60"],
  },
  coffee: {
    business: "Bean There Coffee Cart",
    products: ["Flat white", "Iced coffee", "Hot chocolate"],
    specials: ["Demo coffee and rusk · R45", "Demo iced coffee · R40"],
  },
  pancakes: {
    business: "Flippin' Good Pancakes",
    products: ["Cinnamon pancakes", "Savoury pancakes", "Mini pancake stack"],
    specials: ["Demo pancake trio · R55", "Demo savoury pancake · R50"],
  },
  crafts: {
    business: "Handmade Corner Studio",
    products: ["Beaded keyrings", "Ceramic bowls", "Handmade cards"],
    specials: ["Demo craft gift set · R75", "Demo ceramic cup · R90"],
  },
  clothing: {
    business: "Market Day Threads",
    products: ["Aprons", "Cotton tote bags", "Printed tea towels"],
    specials: ["Demo apron and tote · R140", "Demo tea towel pair · R70"],
  },
  other: {
    business: "Market Mix Demo Stall",
    products: ["Gift baskets", "Local treats", "Market-day gifts"],
    specials: ["Demo gift basket · R110", "Demo market bundle · R85"],
  },
}

function createEmptyListings(): ListingsByKey {
  return Object.fromEntries(
    stalls.map((stall) => [
      stall.key,
      {
        key: stall.key,
        number: stall.number,
        businessName: "",
        category: "other",
        products: [],
        whatsapp: "",
        freeListing: true,
        featured: false,
        saturdaySpecial: false,
        premium: false,
        featuredUntil: "",
        special: "",

        specialToday: false,

        availabilityStatus: "open-today",
      } satisfies StallListing,
    ]),
  )
}

export function createDefaultListings(): ListingsByKey {
  return Object.fromEntries(
    stalls.map((stall, index) => {
      const category = DEMO_CATEGORIES[index % DEMO_CATEGORIES.length]
      const vendor = demoVendors[category]
      const isFeatured = index % 13 === 0
      const hasSaturdaySpecial = index % 5 === 0

      return [
        stall.key,
        {
          key: stall.key,
          number: stall.number,
          businessName: `DEMO ${String(index + 1).padStart(3, "0")} · ${vendor.business}`,
          category,
          products: vendor.products,
          whatsapp: "",
          freeListing: index % 4 !== 0,
          featured: isFeatured,
          saturdaySpecial: hasSaturdaySpecial,
          premium: index % 29 === 0,
          featuredUntil: isFeatured ? "2026-12-31" : "",
          special: hasSaturdaySpecial
            ? `DEMO ONLY · ${vendor.specials[index % vendor.specials.length]}`
            : "",
          specialToday: hasSaturdaySpecial && index % 10 === 0,
          availabilityStatus:
            availabilityStatuses[index % availabilityStatuses.length],
        } satisfies StallListing,
      ]
    }),
  )
}

function isListing(value: unknown, key: string): value is StallListing {
  if (!value || typeof value !== "object") return false

  const listing = value as Partial<StallListing>

  return (
    listing.key === key &&
    typeof listing.number === "string" &&
    typeof listing.businessName === "string" &&
    listingCategories.includes(listing.category as ListingCategory) &&
    Array.isArray(listing.products) &&
    listing.products.every((product) => typeof product === "string") &&
    typeof listing.whatsapp === "string" &&
    typeof listing.freeListing === "boolean" &&
    typeof listing.featured === "boolean" &&
    typeof listing.saturdaySpecial === "boolean" &&
    typeof listing.premium === "boolean" &&
    typeof listing.featuredUntil === "string" &&
    typeof listing.special === "string" &&
    typeof listing.specialToday === "boolean" &&
    (listing.availabilityStatus === undefined ||
      availabilityStatuses.includes(
        listing.availabilityStatus as AvailabilityStatus,
      ))
  )
}

export function readListings(): ListingsByKey {
  const defaults = createDefaultListings()

  const currentStored = localStorage.getItem(STORAGE_KEY)
  const stored = currentStored ?? localStorage.getItem(LEGACY_STORAGE_KEY)
  const isLegacy = !currentStored && stored !== null

  if (!stored) return defaults

  let parsed: unknown

  try {
    parsed = JSON.parse(stored)
  } catch (error) {
    console.error("Unable to read saved market listings", error)

    return defaults
  }

  if (!parsed || typeof parsed !== "object") {
    console.error("Saved market listings have an invalid format")

    return defaults
  }

  for (const [key, listing] of Object.entries(parsed)) {
    if (key in defaults && isListing(listing, key)) {
      const isBlankLegacyListing =
        isLegacy &&
        listing.businessName === "" &&
        listing.category === "other" &&
        listing.products.length === 0 &&
        listing.whatsapp === "" &&
        listing.freeListing &&
        !listing.featured &&
        !listing.saturdaySpecial &&
        !listing.premium &&
        listing.featuredUntil === "" &&
        listing.special === "" &&
        !listing.specialToday

      if (!isBlankLegacyListing) {
        defaults[key] = {
          ...listing,
          availabilityStatus:
            listing.availabilityStatus ?? defaults[key].availabilityStatus,
        }
      }
    } else console.error(`Ignoring invalid saved market listing: ${key}`)
  }

  return defaults
}

export function saveListings(listings: ListingsByKey): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings))

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function readTodaySpecials(): TodaySpecial[] {
  const stored = localStorage.getItem(SPECIALS_STORAGE_KEY)
  if (!stored) return defaultTodaySpecials.map((special) => ({ ...special }))

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch (error) {
    console.error("Unable to read saved Saturday specials", error)
    return defaultTodaySpecials.map((special) => ({ ...special }))
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.icon === "string" &&
        typeof item.product === "string" &&
        typeof item.stall === "string",
    )
  ) {
    console.error("Saved Saturday specials have an invalid format")
    return defaultTodaySpecials.map((special) => ({ ...special }))
  }

  return parsed
}

export function saveTodaySpecials(specials: TodaySpecial[]): void {
  localStorage.setItem(SPECIALS_STORAGE_KEY, JSON.stringify(specials))
  window.dispatchEvent(new CustomEvent(SPECIALS_CHANGE_EVENT))
}

export function subscribeToTodaySpecials(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SPECIALS_STORAGE_KEY) onChange()
  }
  window.addEventListener("storage", handleStorage)
  window.addEventListener(SPECIALS_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(SPECIALS_CHANGE_EVENT, onChange)
  }
}

export function subscribeToListings(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === LEGACY_STORAGE_KEY)
      onChange()
  }

  window.addEventListener("storage", handleStorage)

  window.addEventListener(CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener("storage", handleStorage)

    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function getListingColor(category: ListingCategory): string {
  switch (category) {
    case "meat":

    case "biltong":

    case "vegetables":

    case "fruit":

    case "bakery":

    case "pancakes":
      return "food"

    case "plants":
      return "plants"

    case "crafts":

    case "clothing":
      return "crafts"

    case "coffee":
      return "coffee"

    case "other":
      return "other"
  }
}

export function isFeaturedActive(
  listing: StallListing,
  now = new Date(),
): boolean {
  if (!listing.featured) return false

  if (!listing.featuredUntil) return true

  return (
    new Date(`${listing.featuredUntil}T23:59:59`).getTime() >= now.getTime()
  )
}
