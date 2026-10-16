import { useRef, useState, type FormEvent } from "react"
import MarketMap, { type MarketMapHandle } from "./components/MarketMap"
import { stallKeysByNumber, stallsByKey } from "./data/stalls"

type Language = "af" | "en"

const copy = {
  af: {
    eyebrow: "Vind jou gunsteling",
    title: "Pretoria Boeremark",
    intro:
      "Verken die mark, soek ’n stalletjienommer, of tik direk op die kaart.",
    searchLabel: "Soek ’n stalletjie",
    searchPlaceholder: "bv. 336A",
    searchAction: "Vind",
    notFound: "Ons kon nie dié stalletjienommer kry nie.",
    selected: "Gekose stalletjie",
    empty: "Kies ’n blok op die kaart om sy nommer hier te sien.",
    stall: "Stalletjie",
    comingSoon: "Uitstallerbesonderhede word binnekort bygevoeg.",
    mapLabel:
      "Interaktiewe stalletjiekaart. Sleep om te beweeg en knyp of rol om in te zoem.",
    zoomIn: "Zoem in",
    zoomOut: "Zoem uit",
    reset: "Wys die hele kaart",
    hint: "Sleep om te beweeg · Knyp of rol om te zoem",
    af: "AF",
    en: "EN",
  },
  en: {
    eyebrow: "Find your favourite",
    title: "Pretoria Boeremark",
    intro: "Explore the market, search a stall number, or tap the map.",
    searchLabel: "Find a stall",
    searchPlaceholder: "e.g. 336A",
    searchAction: "Find",
    notFound: "We could not find that stall number.",
    selected: "Selected stall",
    empty: "Select a block on the map to see its number here.",
    stall: "Stall",
    comingSoon: "Vendor details will be added soon.",
    mapLabel:
      "Interactive stall map. Drag to move and pinch or scroll to zoom.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Show the full map",
    hint: "Drag to move · Pinch or scroll to zoom",
    af: "AF",
    en: "EN",
  },
} as const

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

export default function App() {
  const [language, setLanguage] = useState<Language>("af")
  const [query, setQuery] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [notFound, setNotFound] = useState(false)
  const mapRef = useRef<MarketMapHandle>(null)
  const text = copy[language]
  const selected = selectedKeys[0]
    ? stallsByKey.get(selectedKeys[0])
    : undefined

  const selectKey = (key: string) => {
    const stall = stallsByKey.get(key)
    if (!stall) return
    setSelectedKeys(
      stallKeysByNumber.get(stall.number.trim().toUpperCase()) ?? [key],
    )
    setNotFound(false)
  }

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const keys = stallKeysByNumber.get(query.trim().toUpperCase())
    if (!keys) {
      setNotFound(true)
      return
    }
    setNotFound(false)
    setSelectedKeys(keys)
    mapRef.current?.focusStalls(keys)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="intro">{text.intro}</p>
        </div>
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
      </header>

      <section className="workspace">
        <div className="map-card">
          <MarketMap
            ref={mapRef}
            selectedKeys={selectedKeys}
            onStallSelect={selectKey}
            ariaLabel={text.mapLabel}
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
          <div className="map-hint">{text.hint}</div>
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
            {notFound && (
              <p className="form-error" role="alert">
                {text.notFound}
              </p>
            )}
          </form>

          <section className="selection-card" aria-live="polite">
            <p className="card-label">{text.selected}</p>
            {selected ? (
              <>
                <div className="stall-number" aria-hidden="true">
                  {selected.number}
                </div>
                <h2>
                  {text.stall} {selected.number}
                </h2>
                <p>{text.comingSoon}</p>
              </>
            ) : (
              <p className="empty-state">{text.empty}</p>
            )}
          </section>

          <div className="legend-card">
            <span className="legend-swatch stall-swatch" />
            <span>{language === "af" ? "Stalletjies" : "Stalls"}</span>
            <span className="legend-swatch green-swatch" />
            <span>{language === "af" ? "Oop ruimtes" : "Open spaces"}</span>
            <span className="legend-swatch water-swatch" />
            <span>{language === "af" ? "Waterloop" : "Watercourse"}</span>
            <span className="legend-swatch toilet-swatch">WC</span>
            <span>{language === "af" ? "Toilette" : "Toilets"}</span>
          </div>
        </aside>
      </section>
    </main>
  )
}
