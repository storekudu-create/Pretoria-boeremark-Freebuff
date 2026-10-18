import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import SponsorEditor from "./SponsorEditor"
import type { Sponsor } from "../data/sponsors"
import VendorAccess from "./VendorAccess"
import ListingImageUpload from "./ListingImageUpload"
import MarketMap, { type MarketMapHandle } from "./MarketMap"
import {
  readListings,
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
  sponsors: Sponsor[]
  sponsorsRevision: number
  onSaveSponsors: (sponsors: Sponsor[], revision: number) => Promise<void>

  onSave: (listing: StallListing) => Promise<void>
  onSaveSaturdaySpecials: (specials: TodaySpecial[]) => Promise<void>

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

    specialsHours: "Shown all week until Saturday 09:30 (South African time)",

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

    specialsHours: "Wys die hele week tot Saterdag 09:30 (Suid-Afrikaanse tyd)",

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
  sponsors,
  sponsorsRevision,
  onSaveSponsors,
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

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [imageUploads, setImageUploads] = useState(0)

  const [specialsDraft, setSpecialsDraft] = useState<TodaySpecial[]>(() => saturdaySpecials.length ? saturdaySpecials : Array.from({length:4},() => ({icon:"",product:"",stall:""})))

  const [specialsMessage, setSpecialsMessage] = useState("")
  const [specialPhotoUploads, setSpecialPhotoUploads] = useState(0)

  const mapRef = useRef<MarketMapHandle>(null)

  useEffect(() => {
    setDraft(selectedListing ? makeDraft(selectedListing) : undefined)
  }, [selectedListing])

  useEffect(() => {
    setSpecialsDraft(saturdaySpecials.length ? saturdaySpecials.map((special) => ({ ...special })) : Array.from({length:4},() => ({icon:"",product:"",stall:""})))
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

  const handleSpecialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (specialPhotoUploads > 0) return
    try {
      setSaving(true)
      await onSaveSaturdaySpecials(specialsDraft)
      setSpecialsMessage(text.specialsSaved)
    } catch (error) {
      console.error("Unable to save Saturday specials", error)
      setSpecialsMessage((error as Error).message || text.error)
    } finally { setSaving(false) }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!draft || imageUploads > 0 || saving) return

    const next = {
      ...listings,
      [selectedKey]: {
        ...draft,
        products: draft.products.map((product) => product.trim()).filter(Boolean),
      },
    }

    try {
      setSaving(true)
      await onSave(next[selectedKey])

      setMessage(text.saved)
    } catch (error) {
      console.error("Unable to save market listing", error)

      setMessage((error as Error).message || text.error)
    } finally { setSaving(false) }
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

      <SponsorEditor sponsors={sponsors} revision={sponsorsRevision} language={language} onSave={onSaveSponsors} />
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
              </div>
              {specialsDraft.map((special, index) => (
                <fieldset className="admin-special-row" key={index}>
                  <legend>{index + 1}</legend>
                  <ListingImageUpload
                    id={"advertisement-photo-" + index}
                    label={language === "af" ? "Aanbodfoto" : "Offer photo"}
                    language={language}
                    kind="logo"
                    value={special.photo}
                    saveLabel={text.saveSpecials}
                    onChange={(value) => updateSpecial(index, "photo", value)}
                    onProcessingChange={(busy) => setSpecialPhotoUploads((count) => Math.max(0, count + (busy ? 1 : -1)))}
                  />
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
                <button type="submit" className="primary-button" disabled={specialPhotoUploads > 0 || saving}>
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

            <VendorAccess key={selectedKey} stallKey={selectedKey} number={selectedListing?.number || ""} language={language} />
            <button type="button" className="secondary-button" onClick={() => { if (confirm(language === "af" ? "Laai hierdie blaaier se ou besonderhede in die vorm? Klik Stoor om te publiseer." : "Load this browser’s old details into the form? Click Save to publish.")) { const old = readListings()[selectedKey]; if(old && selectedListing) setDraft({...old, key: selectedListing.key, number: selectedListing.number, revision: selectedListing.revision}) } }}>{language === "af" ? "Laai ou blaaierbesonderhede" : "Load old browser details"}</button>
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

                <ListingImageUpload
                  key={draft.key + "-logo"}
                  id="stall-logo"
                  label={language === "af" ? "Stalletjie-logo" : "Stall logo"}
                  language={language}
                  kind="logo"
                  value={draft.logoImage}
                  onChange={(value) => updateDraft("logoImage", value)}
                  onProcessingChange={(busy) => setImageUploads((count) => Math.max(0, count + (busy ? 1 : -1)))}
                />
                <label className="field-label" htmlFor="admin-description">{language === "af" ? "Beskrywing" : "Description"}</label>
                <textarea id="admin-description" className="admin-input" rows={4} maxLength={2000} value={draft.description || ""} onChange={e => updateDraft("description",e.target.value)} />
                <label className="field-label" htmlFor="admin-website">{language === "af" ? "Webwerf" : "Website"}</label>
                <input id="admin-website" className="admin-input" type="url" maxLength={500} value={draft.website || ""} onChange={e => updateDraft("website",e.target.value)} />
                <label className="field-label" htmlFor="admin-promotion">{language === "af" ? "Promosie-aanbod" : "Promotional offer"}</label>
                <textarea id="admin-promotion" className="admin-input" rows={3} maxLength={2000} value={draft.promotionalOffer || ""} onChange={e => updateDraft("promotionalOffer",e.target.value)} />
                {Array.from({length: Math.min(6,(draft.productPhotos?.length || 0)+1)},(_,i) => <ListingImageUpload key={draft.key + "-product-"+i} id={"admin-product-"+i} label={(language === "af" ? "Produkfoto " : "Product photo ")+(i+1)} language={language} kind="photo" value={draft.productPhotos?.[i]} onProcessingChange={busy => setImageUploads(n => Math.max(0,n+(busy?1:-1)))} onChange={value => setDraft(current => { if(!current)return current;const photos=[...(current.productPhotos || [])];if(value)photos[i]=value;else photos.splice(i,1);return {...current,productPhotos:photos} })} />)}
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

                      event.target.value.split("\n"),
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

                <ListingImageUpload
                  key={draft.key + "-special"}
                  id="stall-special-image"
                  label={language === "af" ? "Foto van die dag se spesiale aanbod" : "Special of the day photo"}
                  language={language}
                  kind="photo"
                  value={draft.specialImage}
                  onChange={(value) => updateDraft("specialImage", value)}
                  onProcessingChange={(busy) => setImageUploads((count) => Math.max(0, count + (busy ? 1 : -1)))}
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
                  <button type="submit" className="primary-button" disabled={imageUploads > 0 || saving}>
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
        <p className="storage-note">{language === "af" ? "Veranderinge word aanlyn gestoor en met alle besoekers gedeel. DEMO-lysings is fiktief." : "Changes are saved online and shared with all visitors. DEMO listings are fictional."}</p>
      </section>
    </main>
  )
}

export default AdminPage
