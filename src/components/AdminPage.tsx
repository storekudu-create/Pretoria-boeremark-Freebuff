import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import MarketMap, { type MarketMapHandle } from "./MarketMap"
import {
  availabilityStatuses,
  listingCategories,
  type AvailabilityStatus,
  type ListingCategory,
  type ListingsByKey,
  type StallListing,
  type TodaySpecial,
} from "../data/listings"

import { stalls } from "../data/stalls"

type Language = "af" | "en"

type AdminPageProps = {
  language: Language

  listings: ListingsByKey
  saturdaySpecials: TodaySpecial[]

  onSave: (listings: ListingsByKey) => void
  onSaveSaturdaySpecials: (specials: TodaySpecial[]) => void

  onBack: () => void
}

type CategoryName = {
  en: string
  af: string
}

const categoryNames: Record<ListingCategory, CategoryName> = {
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

const availabilityNames: Record<AvailabilityStatus, CategoryName> = {
  "open-today": { en: "Open today", af: "Vandag oop" },
  "coming-soon": { en: "Coming soon", af: "Kom binnekort" },
  closed: { en: "Closed", af: "Gesluit" },
  "available-to-rent": {
    en: "Available to rent",
    af: "Beskikbaar om te huur",
  },
}

const labels = {
  en: {
    eyebrow: "Market management",

    title: "Stall listings",

    back: "Public map",

    chooseStall: "Choose a stall",

    mapLabel: "Interactive stall map. Select a stall to edit its listing.",

    mapLoadError: "The map could not be loaded.",

    retryMap: "Retry",

    zoomIn: "Zoom in",

    zoomOut: "Zoom out",

    resetMap: "Show the full map",

    specialsTitle: "Saturday morning advertisement",

    specialsHours: "Shown Saturdays from 04:30 to 07:00",

    specialsIcon: "Icon",

    specialsProduct: "Offer",

    specialsStall: "Stall number",

    saveSpecials: "Save advertisement",

    specialsSaved: "Saturday advertisement saved.",

    businessName: "Business name",

    category: "Category",

    availability: "Stall status",

    products: "Products (one per line)",

    whatsapp: "WhatsApp number",

    advertising: "Advertising",

    freeListing: "Free listing",

    featured: "Featured",

    saturdaySpecial: "Saturday Special",

    premium: "Premium",

    featuredUntil: "Featured until",

    special: "Special",

    specialPlaceholder: "e.g. 2 packets rusks R80",

    specialToday: "Show as a special today",

    save: "Save listing",

    saved: "Listing saved. The public map now shows these details.",

    error: "Could not save the listing. Check browser storage and try again.",

    storageNote:
      "DEMO listings are fictional. Replace them with verified vendor details before launch. Listings are stored in this browser and shared with the public map on this device.",
  },

  af: {
    eyebrow: "Markbestuur",

    title: "Stalletjielysings",

    back: "Openbare kaart",

    chooseStall: "Kies ’n stalletjie",

    mapLabel:
      "Interaktiewe stalletjiekaart. Kies ’n stalletjie om sy lysing te wysig.",

    mapLoadError: "Die kaart kon nie laai nie.",

    retryMap: "Probeer weer",

    zoomIn: "Zoem in",

    zoomOut: "Zoem uit",

    resetMap: "Wys die hele kaart",

    specialsTitle: "Saterdagoggend-advertensie",

    specialsHours: "Wys Saterdae van 04:30 tot 07:00",

    specialsIcon: "Ikoon",

    specialsProduct: "Aanbod",

    specialsStall: "Stalletjienommer",

    saveSpecials: "Stoor advertensie",

    specialsSaved: "Saterdagadvertensie gestoor.",

    businessName: "Besigheidsnaam",

    category: "Kategorie",

    availability: "Stalletjiestatus",

    products: "Produkte (een per reël)",

    whatsapp: "WhatsApp-nommer",

    advertising: "Advertensies",

    freeListing: "Gratis lysing",

    featured: "Uitgelig",

    saturdaySpecial: "Saterdag-aanbod",

    premium: "Premium",

    featuredUntil: "Uitgelig tot",

    special: "Spesiale aanbod",

    specialPlaceholder: "bv. 2 pakkies beskuit R80",

    specialToday: "Wys vandag as ’n spesiale aanbod",

    save: "Stoor lysing",

    saved: "Lysing gestoor. Die openbare kaart wys nou hierdie besonderhede.",

    error: "Kon nie stoor nie. Gaan blaaierberging na en probeer weer.",

    storageNote:
      "DEMO-lysings is fiktief. Vervang dit met bevestigde uitstallerbesonderhede voor bekendstelling. Lysings word in hierdie blaaier gestoor en op hierdie toestel met die openbare kaart gedeel.",
  },
} as const

function makeDraft(listing: StallListing): StallListing {
  return { ...listing, products: [...listing.products] }
}

function AdminPage({
  language,
  listings,
  saturdaySpecials,
  onSave,
  onSaveSaturdaySpecials,
  onBack,
}: AdminPageProps) {
  const text = labels[language]

  const sortedStalls = useMemo(
    () => [...stalls].sort((a, b) => a.number.localeCompare(b.number)),

    [],
  )

  const [selectedKey, setSelectedKey] = useState(sortedStalls[0]?.key ?? "")

  const selectedListing = selectedKey ? listings[selectedKey] : undefined

  const [draft, setDraft] = useState<StallListing | undefined>(() =>
    selectedListing ? makeDraft(selectedListing) : undefined,
  )

  const [message, setMessage] = useState("")

  const [specialsDraft, setSpecialsDraft] = useState(saturdaySpecials)

  const [specialsMessage, setSpecialsMessage] = useState("")

  const mapRef = useRef<MarketMapHandle>(null)

  useEffect(() => {
    setDraft(selectedListing ? makeDraft(selectedListing) : undefined)
  }, [selectedListing])

  useEffect(() => {
    setSpecialsDraft(saturdaySpecials.map((special) => ({ ...special })))
  }, [saturdaySpecials])

  const changeStall = (key: string) => {
    setSelectedKey(key)

    setDraft(listings[key] ? makeDraft(listings[key]) : undefined)

    setMessage("")
  }

  const updateDraft = <K extends keyof StallListing,>(
    key: K,

    value: StallListing[K],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const updateSpecial = (
    index: number,
    field: keyof TodaySpecial,
    value: string,
  ) => {
    setSpecialsDraft((current) =>
      current.map((special, itemIndex) =>
        itemIndex === index ? { ...special, [field]: value } : special,
      ),
    )
    setSpecialsMessage("")
  }

  const handleSpecialsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      onSaveSaturdaySpecials(specialsDraft)
      setSpecialsMessage(text.specialsSaved)
    } catch (error) {
      console.error("Unable to save Saturday specials", error)
      setSpecialsMessage(text.error)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!draft) return

    const next = { ...listings, [selectedKey]: draft }

    try {
      onSave(next)

      setMessage(text.saved)
    } catch (error) {
      console.error("Unable to save market listing", error)

      setMessage(text.error)
    }
  }

  return (
    <main className="app-shell admin-shell">
      <header className="hero admin-hero">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          {text.back}
        </button>
      </header>

      <section className="admin-card">
        <div className="admin-workspace">
          <div className="admin-map-column">
            <div className="admin-map-card map-card">
              <MarketMap
                ref={mapRef}
                selectedKeys={selectedKey ? [selectedKey] : []}
                listings={listings}
                onStallSelect={changeStall}
                onFeatureSelect={(feature) =>
                  mapRef.current?.focusFeatures([feature])
                }
                ariaLabel={text.mapLabel}
                loadErrorLabel={text.mapLoadError}
                retryLabel={text.retryMap}
              />
              <div className="zoom-controls" aria-label={text.mapLabel}>
                <button
                  type="button"
                  title={text.zoomIn}
                  aria-label={text.zoomIn}
                  onClick={() => mapRef.current?.zoomIn()}
                >
                  +
                </button>
                <button
                  type="button"
                  title={text.zoomOut}
                  aria-label={text.zoomOut}
                  onClick={() => mapRef.current?.zoomOut()}
                >
                  −
                </button>
                <button
                  type="button"
                  title={text.resetMap}
                  aria-label={text.resetMap}
                  onClick={() => mapRef.current?.reset()}
                >
                  ↺
                </button>
              </div>
            </div>
          </div>

          <div className="admin-form-panel">
            <form
              className="admin-specials-editor"
              onSubmit={handleSpecialsSubmit}
            >
              <div className="admin-specials-heading">
                <h2>{text.specialsTitle}</h2>
                <p>{text.specialsHours}</p>
              </div>
              {specialsDraft.map((special, index) => (
                <fieldset className="admin-special-row" key={index}>
                  <legend>{index + 1}</legend>
                  <label>
                    <span>{text.specialsIcon}</span>
                    <input
                      className="admin-input admin-special-icon"
                      value={special.icon}
                      maxLength={8}
                      onChange={(event) =>
                        updateSpecial(index, "icon", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>{text.specialsProduct}</span>
                    <input
                      className="admin-input"
                      value={special.product}
                      onChange={(event) =>
                        updateSpecial(index, "product", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>{text.specialsStall}</span>
                    <input
                      className="admin-input"
                      value={special.stall}
                      onChange={(event) =>
                        updateSpecial(index, "stall", event.target.value)
                      }
                    />
                  </label>
                </fieldset>
              ))}
              <div className="admin-save-row">
                <button type="submit" className="primary-button">
                  {text.saveSpecials}
                </button>
                {specialsMessage && (
                  <p className="save-message" role="status">
                    {specialsMessage}
                  </p>
                )}
              </div>
            </form>

            <label className="field-label" htmlFor="admin-stall">
              {text.chooseStall}
            </label>
            <select
              id="admin-stall"
              className="admin-input"
              value={selectedKey}
              onChange={(event) => changeStall(event.target.value)}
            >
              {sortedStalls.map((stall) => (
                <option key={stall.key} value={stall.key}>
                  {language === "af" ? "Stalletjie" : "Stall"} {stall.number}
                  {stall.key !== stall.number ? ` · ${stall.key}` : ""}
                </option>
              ))}
            </select>

            {draft && (
              <form className="admin-form" onSubmit={handleSubmit}>
                <h2>
                  {language === "af" ? "Stalletjie" : "Stall"} {draft.number}
                </h2>
                <label className="field-label" htmlFor="business-name">
                  {text.businessName}
                </label>
                <input
                  id="business-name"
                  className="admin-input"
                  value={draft.businessName}
                  onChange={(event) =>
                    updateDraft("businessName", event.target.value)
                  }
                />

                <label className="field-label" htmlFor="stall-category">
                  {text.category}
                </label>
                <select
                  id="stall-category"
                  className="admin-input"
                  value={draft.category}
                  onChange={(event) =>
                    updateDraft(
                      "category",
                      event.target.value as ListingCategory,
                    )
                  }
                >
                  {listingCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryNames[category][language]}
                    </option>
                  ))}
                </select>

                <label className="field-label" htmlFor="stall-availability">
                  {text.availability}
                </label>
                <select
                  id="stall-availability"
                  className="admin-input"
                  value={draft.availabilityStatus}
                  onChange={(event) =>
                    updateDraft(
                      "availabilityStatus",
                      event.target.value as AvailabilityStatus,
                    )
                  }
                >
                  {availabilityStatuses.map((status) => (
                    <option key={status} value={status}>
                      {availabilityNames[status][language]}
                    </option>
                  ))}
                </select>

                <label className="field-label" htmlFor="stall-products">
                  {text.products}
                </label>
                <textarea
                  id="stall-products"
                  className="admin-input admin-textarea"
                  rows={5}
                  value={draft.products.join("\n")}
                  onChange={(event) =>
                    updateDraft(
                      "products",

                      event.target.value

                        .split("\n")

                        .map((product) => product.trim())

                        .filter(Boolean),
                    )
                  }
                />

                <label className="field-label" htmlFor="stall-whatsapp">
                  {text.whatsapp}
                </label>
                <input
                  id="stall-whatsapp"
                  className="admin-input"
                  type="tel"
                  inputMode="tel"
                  value={draft.whatsapp}
                  onChange={(event) =>
                    updateDraft("whatsapp", event.target.value)
                  }
                  placeholder="+27 82 123 4567"
                />

                <fieldset className="advertising-options">
                  <legend>{text.advertising}</legend>
                  {([
                    ["freeListing", text.freeListing],

                    ["featured", text.featured],

                    ["saturdaySpecial", text.saturdaySpecial],

                    ["premium", text.premium],
                  ] as const)

                    .map(([key, label]) => (
                      <label className="checkbox-row" key={key}>
                        <input
                          type="checkbox"
                          checked={draft[key]}
                          onChange={(event) =>
                            updateDraft(key, event.target.checked)
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                </fieldset>

                <label className="field-label" htmlFor="featured-until">
                  {text.featuredUntil}
                </label>
                <input
                  id="featured-until"
                  className="admin-input"
                  type="date"
                  value={draft.featuredUntil}
                  onChange={(event) =>
                    updateDraft("featuredUntil", event.target.value)
                  }
                />

                <label className="field-label" htmlFor="stall-special">
                  {text.special}
                </label>
                <textarea
                  id="stall-special"
                  className="admin-input admin-textarea"
                  rows={2}
                  value={draft.special}
                  placeholder={text.specialPlaceholder}
                  onChange={(event) =>
                    updateDraft("special", event.target.value)
                  }
                />

                <label className="checkbox-row special-toggle">
                  <input
                    type="checkbox"
                    checked={draft.specialToday}
                    onChange={(event) =>
                      updateDraft("specialToday", event.target.checked)
                    }
                  />
                  <span>{text.specialToday}</span>
                </label>

                <div className="admin-save-row">
                  <button type="submit" className="primary-button">
                    {text.save}
                  </button>
                  {message && (
                    <p className="save-message" role="status">
                      {message}
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
        <p className="storage-note">{text.storageNote}</p>
      </section>
    </main>
  )
}

export default AdminPage
