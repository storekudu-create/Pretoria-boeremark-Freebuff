import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import AdminPage from "./components/AdminPage"

import MarketMap, { type MarketMapHandle } from "./components/MarketMap"

import {
  createDefaultListings,
  defaultTodaySpecials,
  type AvailabilityStatus,
  isFeaturedActive,
  listingCategories,
  readListings,
  saveListings,
  readTodaySpecials,
  saveTodaySpecials,
  subscribeToListings,
  subscribeToTodaySpecials,
  type ListingCategory,
  type ListingsByKey,
  type StallListing,
  type TodaySpecial,
} from "./data/listings"

type Language = "af" | "en"

type Page = "map" | "admin"

const copy = {
  af: {
    eyebrow: "Vind jou gunsteling",

    title: "Pretoria Boeremark",

    intro:
      "Verken die mark, soek ’n stalletjie of produk, of tik op die kaart.",

    demoNotice:
      "DEMO-DATA: Besighede, produkte en aanbiedinge is fiktiewe toetsdata.",

    demoStatusNotice: "Stalletjiestatusse is fiktiewe toetsdata.",

    publicMap: "Markkaart",

    admin: "Administrasie",

    searchLabel: "Soek stalletjie, besigheid of produk",

    searchPlaceholder: "bv. 336A, beskuit of koffie",

    searchAction: "Soek",

    notFound: "Geen stalletjies pas by jou soektog nie.",

    category: "Kategorie",

    allCategories: "Alle kategorieë",

    results: "Stalletjies",

    selected: "Stalletjiebesonderhede",

    empty: "Kies ’n groen stalletjie op die kaart om sy besonderhede te sien.",

    stall: "Stalletjie",

    products: "Produkte",

    noProducts: "Kontak die uitstaller vir die volledige produklys.",

    whatsapp: "WhatsApp die uitstaller",

    showMe: "Wys my waar",

    featured: "Uitgelig",

    saturdaySpecial: "Saterdag-aanbod",

    specialToday: "Spesiale aanbod vandag",

    mapLabel:
      "Interaktiewe stalletjiekaart. Sleep om te beweeg en knyp of rol om in te zoem.",

    zoomIn: "Zoem in",

    zoomOut: "Zoem uit",

    reset: "Wys die hele kaart",

    mapLoadError: "Die kaart kon nie laai nie.",

    retry: "Probeer weer",

    marketInfo: "Oor die mark",

    marketIntro: "Pretoria Boeremark is ’n Saterdagmark in Pretoria.",

    marketLocation: "Wilgerlaan, Silverton, Pretoria",

    marketHours: "Bevestig asseblief markure en datums met die organiseerders.",

    directions: "Aanwysings",

    facilities: "Fasiliteite",

    toilets: "Toilette (WC)",

    access: "In- en uitgange",

    accessInfo:
      "In- en uitgange is nie op die verskafde kaart aangedui nie; vra asseblief die organiseerders.",

    toiletNorthwest: "WC · Noordwes",

    toiletNortheast: "WC · Noordoos",

    legend: "Kaartlegende",

    normal: "Ander stalletjies",

    food: "Kos",

    plants: "Plante",

    crafts: "Handwerk en klere",

    coffee: "Koffie",

    openToday: "Vandag oop",

    comingSoon: "Kom binnekort",

    closed: "Gesluit",

    availableToRent: "Beskikbaar om te huur",

    todaySpecials: "Vandag se Aanbiedinge / Today's Specials",

    specialsHours: "Saterdae · 04:30–07:00",

    af: "AF",

    en: "EN",
  },

  en: {
    eyebrow: "Find your favourite",

    title: "Pretoria Boeremark",

    intro: "Explore the market, search for a stall or product, or tap the map.",

    demoNotice:
      "DEMO DATA: Businesses, products and specials are fictional test listings.",

    demoStatusNotice: "Stall statuses are fictional test data.",

    publicMap: "Market map",

    admin: "Administration",

    searchLabel: "Search stall, business or product",

    searchPlaceholder: "e.g. 336A, rusks or coffee",

    searchAction: "Search",

    notFound: "No stalls match your search.",

    category: "Category",

    allCategories: "All categories",

    results: "Stalls",

    selected: "Stall details",

    empty: "Select a green stall on the map to see its details.",

    stall: "Stall",

    products: "Products",

    noProducts: "Contact the vendor for their full product list.",

    whatsapp: "WhatsApp vendor",

    showMe: "Show me where",

    featured: "Featured",

    saturdaySpecial: "Saturday Special",

    specialToday: "Special today",

    mapLabel:
      "Interactive stall map. Drag to move and pinch or scroll to zoom.",

    zoomIn: "Zoom in",

    zoomOut: "Zoom out",

    reset: "Show the full map",

    mapLoadError: "The map could not be loaded.",

    retry: "Retry",

    marketInfo: "Market information",

    marketIntro: "Pretoria Boeremark is a Saturday market in Pretoria.",

    marketLocation: "Wilgerlaan, Silverton, Pretoria",

    marketHours: "Please confirm market hours and dates with the organizers.",

    directions: "Directions",

    facilities: "Facilities",

    toilets: "Toilets (WC)",

    access: "Entrances and exits",

    accessInfo:
      "The supplied map does not identify entrance and exit locations; please ask the organizers.",

    toiletNorthwest: "WC · Northwest",

    toiletNortheast: "WC · Northeast",

    legend: "Map legend",

    normal: "Other stalls",

    food: "Food",

    plants: "Plants",

    crafts: "Crafts and clothing",

    coffee: "Coffee",

    openToday: "Open today",

    comingSoon: "Coming soon",

    closed: "Closed",

    availableToRent: "Available to rent",

    todaySpecials: "Vandag se Aanbiedinge / Today's Specials",

    specialsHours: "Saturdays · 04:30–07:00",

    af: "AF",

    en: "EN",
  },
} as const

const categoryLabels: Record<ListingCategory, Record<Language, string>> = {
  meat: { en: "Meat", af: "Vleis" },

  biltong: { en: "Biltong", af: "Biltong" },

  vegetables: { en: "Vegetables", af: "Groente" },

  fruit: { en: "Fruit", af: "Vrugte" },

  plants: { en: "Plants", af: "Plante" },

  bakery: { en: "Bakery", af: "Bakkery" },

  coffee: { en: "Coffee", af: "Koffie" },

  pancakes: { en: "Pancakes", af: "Pannekoek" },

  crafts: { en: "Crafts", af: "Handwerk" },

  clothing: { en: "Clothing", af: "Klere" },

  other: { en: "Other", af: "Ander" },
}

const availabilityLabels: Record<AvailabilityStatus, Record<Language, string>> =
  {
    "open-today": { en: "Open today", af: "Vandag oop" },
    "coming-soon": { en: "Coming soon", af: "Kom binnekort" },
    closed: { en: "Closed", af: "Gesluit" },
    "available-to-rent": {
      en: "Available to rent",
      af: "Beskikbaar om te huur",
    },
  }

function isSaturdaySpecialsTime(date: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute)

  return (
    values.weekday === "Sat" && currentMinutes >= 270 && currentMinutes <= 420
  )
}

function normalize(value: string) {
  return value

    .normalize("NFKD")

    .replace(/\p{Diacritic}/gu, "")

    .trim()

    .toLocaleLowerCase()
}

function matchesListing(
  listing: StallListing,

  term: string,

  categoryFilter: ListingCategory | "all",
) {
  const textMatches =
    !term ||
    normalize(listing.number).includes(term) ||
    normalize(listing.businessName).includes(term) ||
    listing.products.some((product) => normalize(product).includes(term)) ||
    normalize(categoryLabels[listing.category].en).includes(term) ||
    normalize(categoryLabels[listing.category].af).includes(term)

  return (
    textMatches &&
    (categoryFilter === "all" || listing.category === categoryFilter)
  )
}

function ZoomInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-1.4 7.4" />
    </svg>
  )
}

function App() {
  const [language, setLanguage] = useState<Language>("af")

  const [page, setPage] = useState<Page>("map")

  const [query, setQuery] = useState("")

  const [submittedQuery, setSubmittedQuery] = useState("")

  const [categoryFilter, setCategoryFilter] = useState<ListingCategory | "all">(
    "all",
  )

  const [selectedKey, setSelectedKey] = useState("")

  const [notFound, setNotFound] = useState(false)

  const [showSaturdaySpecials, setShowSaturdaySpecials] = useState(() =>
    isSaturdaySpecialsTime(new Date()),
  )

  const [listings, setListings] = useState<ListingsByKey>(() => {
    if (typeof window === "undefined") return createDefaultListings()

    try {
      return readListings()
    } catch (error) {
      console.error("Unable to initialize market listings", error)

      return createDefaultListings()
    }
  })

  const [saturdaySpecials, setSaturdaySpecials] = useState<TodaySpecial[]>(
    () => {
      if (typeof window === "undefined") {
        return defaultTodaySpecials.map((special) => ({ ...special }))
      }
      try {
        return readTodaySpecials()
      } catch (error) {
        console.error("Unable to initialize Saturday specials", error)
        return defaultTodaySpecials.map((special) => ({ ...special }))
      }
    },
  )

  const mapRef = useRef<MarketMapHandle>(null)

  const text = copy[language]

  useEffect(() => {
    const updateSaturdaySpecials = () =>
      setShowSaturdaySpecials(isSaturdaySpecialsTime(new Date()))

    const timer = window.setInterval(updateSaturdaySpecials, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(
    () =>
      subscribeToListings(() => {
        try {
          setListings(readListings())
        } catch (error) {
          console.error("Unable to refresh market listings", error)
        }
      }),

    [],
  )

  useEffect(
    () =>
      subscribeToTodaySpecials(() => {
        try {
          setSaturdaySpecials(readTodaySpecials())
        } catch (error) {
          console.error("Unable to refresh Saturday specials", error)
        }
      }),
    [],
  )

  const matchingStalls = useMemo(() => {
    const term = normalize(submittedQuery)

    return Object.values(listings).filter((listing) => {
      return matchesListing(listing, term, categoryFilter)
    })
  }, [categoryFilter, listings, submittedQuery])

  const selected = selectedKey ? listings[selectedKey] : undefined

  const selectStall = (key: string, focus = false) => {
    if (!listings[key]) return

    setSelectedKey(key)

    setNotFound(false)

    if (focus) mapRef.current?.focusStalls([key])
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const term = normalize(query)

    setSubmittedQuery(query.trim())

    if (!term) {
      setNotFound(false)

      return
    }

    const result = Object.values(listings).filter((listing) =>
      matchesListing(listing, term, categoryFilter),
    )

    if (result.length === 0) {
      setNotFound(true)

      return
    }

    setNotFound(false)

    selectStall(result[0].key)
  }

  const handleMapSelection = (key: string) => {
    selectStall(key)
  }

  const handleSaveListings = (next: ListingsByKey) => {
    saveListings(next)

    setListings(next)
  }

  const handleSaveSaturdaySpecials = (next: TodaySpecial[]) => {
    saveTodaySpecials(next)
    setSaturdaySpecials(next)
  }

  if (page === "admin") {
    return (
      <AdminPage
        language={language}
        listings={listings}
        saturdaySpecials={saturdaySpecials}
        onSave={handleSaveListings}
        onSaveSaturdaySpecials={handleSaveSaturdaySpecials}
        onBack={() => setPage("map")}
      />
    )
  }

  const shownResults =
    submittedQuery || categoryFilter !== "all"
      ? matchingStalls.slice(0, 12)
      : []

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="intro">{text.intro}</p>
        </div>
        <div className="header-actions">
          <nav className="page-switch" aria-label={text.publicMap}>
            <button type="button" className="active" aria-current="page">
              {text.publicMap}
            </button>
            <button type="button" onClick={() => setPage("admin")}>
              {text.admin}
            </button>
          </nav>
          <div className="language-switch" aria-label="Language / Taal">
            {(["af", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={language === option ? "active" : ""}
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
              >
                {copy[language][option]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <p className="demo-notice" role="note">
        {text.demoNotice}
      </p>
      <p className="demo-status-notice" role="note">
        {text.demoStatusNotice}
      </p>

      <section className="workspace">
        <div className="map-column">
          <div className="map-card">
            <MarketMap
              ref={mapRef}
              selectedKeys={selectedKey ? [selectedKey] : []}
              listings={listings}
              onStallSelect={handleMapSelection}
              onFeatureSelect={(feature) => {
                setSelectedKey("")

                mapRef.current?.focusFeatures([feature])
              }}
              ariaLabel={text.mapLabel}
              loadErrorLabel={text.mapLoadError}
              retryLabel={text.retry}
            />
            <div className="zoom-controls" aria-label={text.mapLabel}>
              <button
                type="button"
                title={text.zoomIn}
                aria-label={text.zoomIn}
                onClick={() => mapRef.current?.zoomIn()}
              >
                <ZoomInIcon />
              </button>
              <button
                type="button"
                title={text.zoomOut}
                aria-label={text.zoomOut}
                onClick={() => mapRef.current?.zoomOut()}
              >
                <ZoomOutIcon />
              </button>
              <button
                type="button"
                title={text.reset}
                aria-label={text.reset}
                onClick={() => mapRef.current?.reset()}
              >
                <ResetIcon />
              </button>
            </div>
          </div>
          {showSaturdaySpecials && (
            <section className="today-specials-card" aria-live="polite">
              <div className="today-specials-heading">
                <h2>{text.todaySpecials}</h2>
                <span>{text.specialsHours}</span>
              </div>
              <ul>
                {saturdaySpecials.map((special, index) => {
                  const stall = Object.values(listings).find(
                    (listing) => listing.number === special.stall,
                  )

                  return (
                    <li key={`${special.stall}-${index}`}>
                      {stall ? (
                        <button
                          type="button"
                          onClick={() => selectStall(stall.key)}
                        >
                          <span aria-hidden="true">{special.icon}</span>
                          <strong>{special.product}</strong>
                          <span>
                            {text.stall} {special.stall}
                          </span>
                        </button>
                      ) : (
                        <div>
                          <span aria-hidden="true">{special.icon}</span>
                          <strong>{special.product}</strong>
                          <span>
                            {text.stall} {special.stall}
                          </span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="side-panel">
          <form className="search-card" onSubmit={handleSearch}>
            <label htmlFor="stall-search">{text.searchLabel}</label>
            <div className="search-row">
              <input
                id="stall-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.searchPlaceholder}
                autoComplete="off"
              />
              <button type="submit">{text.searchAction}</button>
            </div>
            <label className="filter-label" htmlFor="category-filter">
              {text.category}
            </label>
            <select
              id="category-filter"
              className="category-filter"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as ListingCategory | "all")
              }
            >
              <option value="all">{text.allCategories}</option>
              {listingCategories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category][language]}
                </option>
              ))}
            </select>
            {notFound && (
              <p className="form-error" role="alert">
                {text.notFound}
              </p>
            )}
          </form>

          {shownResults.length > 0 && (
            <section className="results-card" aria-live="polite">
              <p className="card-label">
                {text.results} · {matchingStalls.length}
              </p>
              <div className="result-list">
                {shownResults.map((listing) => (
                  <button
                    type="button"
                    key={listing.key}
                    className="result-item"
                    onClick={() => selectStall(listing.key)}
                  >
                    <span className="result-stall">{listing.number}</span>
                    <span>
                      <strong>
                        {listing.businessName ||
                          categoryLabels[listing.category][language]}
                      </strong>
                      {listing.products[0] && (
                        <small>{listing.products[0]}</small>
                      )}
                      <small className="availability-label">
                        <span
                          className={`availability-dot status-${listing.availabilityStatus}`}
                          aria-hidden="true"
                        />
                        {
                          availabilityLabels[listing.availabilityStatus][
                            language
                          ]
                        }
                      </small>
                    </span>
                    {isFeaturedActive(listing) && (
                      <span className="featured-pill">{text.featured}</span>
                    )}
                  </button>
                ))}
              </div>
              {matchingStalls.length > shownResults.length && (
                <p className="results-more">
                  +{matchingStalls.length - shownResults.length}
                </p>
              )}
            </section>
          )}

          <section className="selection-card" aria-live="polite">
            <p className="card-label">{text.selected}</p>
            {selected ? (
              <>
                <div
                  className={`stall-number category-${selected.category}`}
                  aria-hidden="true"
                >
                  {selected.number}
                </div>
                <h2>
                  {selected.businessName || `${text.stall} ${selected.number}`}
                </h2>
                {selected.businessName && (
                  <p className="stall-subtitle">
                    {text.stall} {selected.number} ·{" "}
                    {categoryLabels[selected.category][language]}
                  </p>
                )}
                <div className="listing-badges">
                  <span className="availability-label selected-availability">
                    <span
                      className={`availability-dot status-${selected.availabilityStatus}`}
                      aria-hidden="true"
                    />
                    {availabilityLabels[selected.availabilityStatus][language]}
                  </span>
                  {isFeaturedActive(selected) && (
                    <span className="featured-pill">{text.featured}</span>
                  )}
                  {selected.saturdaySpecial && (
                    <span className="special-pill">{text.saturdaySpecial}</span>
                  )}
                </div>
                {selected.special && (
                  <p
                    className={`special-text${
                      selected.specialToday ? " special-today" : ""
                    }`}
                  >
                    {selected.specialToday && (
                      <strong>{text.specialToday}: </strong>
                    )}
                    {selected.special}
                  </p>
                )}
                <h3>{text.products}</h3>
                {selected.products.length > 0 ? (
                  <ul className="product-list">
                    {selected.products.map((product) => (
                      <li key={product}>{product}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{text.noProducts}</p>
                )}
                <div className="selection-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => mapRef.current?.focusStalls([selected.key])}
                  >
                    {text.showMe}
                  </button>
                  {selected.whatsapp && (
                    <a
                      className="whatsapp-button"
                      href={`https://wa.me/${selected.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                        language === "af"
                          ? `Hallo, ek het jou by Pretoria Boeremark gevind.`
                          : `Hi, I found you at Pretoria Boeremark.`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {text.whatsapp}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="empty-state">{text.empty}</p>
            )}
          </section>

          <section className="legend-card">
            <p className="card-label">{text.legend}</p>
            <div className="legend-row">
              <span className="legend-swatch swatch-other" />
              <span>{text.normal}</span>
              <span className="legend-swatch swatch-food" />
              <span>{text.food}</span>
              <span className="legend-swatch swatch-plants" />
              <span>{text.plants}</span>
              <span className="legend-swatch swatch-crafts" />
              <span>{text.crafts}</span>
              <span className="legend-swatch swatch-coffee" />
              <span>{text.coffee}</span>
            </div>
            <div className="map-status-legend">
              <span className="legend-featured" />
              <span>{text.featured}</span>
              <span className="legend-special" />
              <span>{text.specialToday}</span>
            </div>
            <div className="availability-legend">
              {([
                "open-today",
                "coming-soon",
                "closed",
                "available-to-rent",
              ] as const).map((status) => (
                <span key={status} className="availability-label">
                  <span className={`availability-dot status-${status}`} />
                  {availabilityLabels[status][language]}
                </span>
              ))}
            </div>
          </section>

          <section className="market-info-card">
            <p className="card-label">{text.marketInfo}</p>
            <h2>{text.title}</h2>
            <p>{text.marketIntro}</p>
            <p>{text.marketLocation}</p>
            <p>{text.marketHours}</p>
            <h3>{text.facilities}</h3>
            <p>{text.toilets}</p>
            <div className="feature-links">
              {[
                [text.toiletNorthwest, "toilets-northwest"],

                [text.toiletNortheast, "toilets-northeast"],
              ].map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  className="feature-link"
                  onClick={() => mapRef.current?.focusFeatures([id])}
                >
                  {label}
                </button>
              ))}
            </div>
            <h3>{text.directions}</h3>
            <p>
              {text.access}: {text.accessInfo}
            </p>
            <a
              className="directions-link"
              href="https://www.google.com/maps/search/?api=1&query=Pretoria+Boeremark+Wilgerlaan+Silverton"
              target="_blank"
              rel="noreferrer"
            >
              {text.directions} · {text.marketLocation}
            </a>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
