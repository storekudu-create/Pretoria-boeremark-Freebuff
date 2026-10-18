import { useEffect, useState, type FormEvent } from "react"
import type { StallListing } from "../data/listings"
import { getVendorListing, saveVendorListing } from "../data/cloud"
import ListingImageUpload from "./ListingImageUpload"

type Props = {
  language: "af" | "en"
  onBack: () => void
  onSaved: (listing: StallListing) => void
}
function initialToken() {
  const fromLink = new URLSearchParams(location.hash.slice(1)).get("vendor")
  if (fromLink) return fromLink
  return ""
}
export default function VendorPortal({ language, onBack, onSaved }: Props) {
  const af = language === "af"
  const [token, setToken] = useState(initialToken)
  useEffect(() => {
    if (new URLSearchParams(location.hash.slice(1)).has("vendor"))
      history.replaceState(null, "", location.pathname + location.search)
  }, [])
  const [code, setCode] = useState("")
  const [draft, setDraft] = useState<StallListing | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!token) return
    let active = true
    setBusy(true)
    setError("")
    getVendorListing(token)
      .then((row) => {
        if (active) {
          setDraft(row)
          setDirty(false)
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message)
          setToken("")
          setDraft(null)
        }
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [token, reload])
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  const update = <K extends keyof StallListing,>(
    key: K,
    value: StallListing[K],
  ) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setDirty(true)
    setMessage("")
  }
  const back = () => {
    if (
      !dirty ||
      confirm(af ? "Verlaat sonder om te stoor?" : "Leave without saving?")
    )
      onBack()
  }
  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft || busy || uploads) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const saved = await saveVendorListing(token, {
        ...draft,
        products: draft.products.map((s) => s.trim()).filter(Boolean),
      })
      setDraft(saved)
      setDirty(false)
      onSaved(saved)
      setMessage(
        af
          ? "Gestoor — jou advertensie is nou op die openbare kaart."
          : "Saved — your advertising is now on the public map.",
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const photoBusy = (isBusy: boolean) =>
    setUploads((n) => Math.max(0, n + (isBusy ? 1 : -1)))
  return (
    <main className="app-shell vendor-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Pretoria Boeremark</p>
          <h1>{af ? "My stalletjie-advertensie" : "My stall advertising"}</h1>
        </div>
        <button className="secondary-button" onClick={back}>
          {af ? "Openbare kaart" : "Public map"}
        </button>
      </header>
      {!draft ? (
        <section className="admin-card vendor-login">
          <h2>{af ? "Uitstaller-aanmelding" : "Vendor sign-in"}</h2>
          <p>
            {af
              ? "Gebruik die privaat skakel of kode wat markbestuur vir jou gegee het."
              : "Use the private link or code supplied by market management."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError("")
              let value = code.trim()
              try {
                if (value.startsWith("https://"))
                  value =
                    new URLSearchParams(new URL(value).hash.slice(1)).get(
                      "vendor",
                    ) || ""
              } catch {
                value = ""
              }
              if (!/^[a-f0-9]{64}$/.test(value)) {
                setError(
                  af
                    ? "Plak jou volledige privaat kode of skakel."
                    : "Paste your complete private code or link.",
                )
                return
              }
              setToken(value)
            }}
          >
            <label htmlFor="vendor-code">
              {af ? "Privaat kode of skakel" : "Private code or link"}
            </label>
            <input
              id="vendor-code"
              className="admin-input"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <button className="primary-button" disabled={busy}>
              {busy
                ? af
                  ? "Besig om oop te maak…"
                  : "Opening…"
                : af
                  ? "Maak my advertensie oop"
                  : "Open my advertising"}
            </button>
          </form>
        </section>
      ) : (
        <form className="admin-card vendor-form" onSubmit={save}>
          <div className="vendor-location">
            <strong>
              {af ? "Stalletjie" : "Stall"} {draft.number}
            </strong>
            <span>
              {af
                ? "Vaste ligging · Kontak markbestuur vir ’n verskuiwing."
                : "Fixed location · Contact market management to move stalls."}
            </span>
          </div>
          <fieldset disabled={busy} className="vendor-fields">
            <label htmlFor="vendor-business">
              {af ? "Besigheidsnaam" : "Business name"}
            </label>
            <input
              className="admin-input"
              id="vendor-business"
              maxLength={160}
              value={draft.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              required
            />
            <ListingImageUpload
              id="vendor-logo"
              label="Logo"
              value={draft.logoImage}
              saveLabel={af ? "Stoor en publiseer" : "Save and publish"}
              language={language}
              kind="logo"
              onChange={(v) => update("logoImage", v)}
              onProcessingChange={photoBusy}
            />
            <label htmlFor="vendor-description">
              {af ? "Beskrywing" : "Description"}
            </label>
            <textarea
              className="admin-input"
              id="vendor-description"
              rows={4}
              maxLength={2000}
              value={draft.description || ""}
              onChange={(e) => update("description", e.target.value)}
            />
            <label htmlFor="vendor-whatsapp">WhatsApp</label>
            <input
              className="admin-input"
              id="vendor-whatsapp"
              type="tel"
              maxLength={30}
              placeholder="+27 82 123 4567"
              value={draft.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
            />
            <label htmlFor="vendor-website">
              {af ? "Webwerf (opsioneel)" : "Website (optional)"}
            </label>
            <input
              className="admin-input"
              id="vendor-website"
              type="url"
              maxLength={500}
              placeholder="https://…"
              value={draft.website || ""}
              onChange={(e) => update("website", e.target.value)}
            />
            <label htmlFor="vendor-products">
              {af ? "Produkte (een per reël)" : "Products (one per line)"}
            </label>
            <textarea
              className="admin-input"
              id="vendor-products"
              rows={5}
              value={draft.products.join("\n")}
              onChange={(e) => update("products", e.target.value.split("\n"))}
            />
            <h2>{af ? "Produkfoto’s" : "Product photos"}</h2>
            <p>
              {af
                ? "Tot 6 foto’s. JPG, PNG of WebP."
                : "Up to 6 photos. JPG, PNG or WebP."}
            </p>
            <div className="vendor-photo-grid">
              {Array.from(
                { length: Math.min(6, (draft.productPhotos?.length || 0) + 1) },
                (_, i) => (
                  <ListingImageUpload
                    key={i}
                    id={"vendor-product-" + i}
                    label={(af ? "Produkfoto " : "Product photo ") + (i + 1)}
                    value={draft.productPhotos?.[i]}
                    saveLabel={af ? "Stoor en publiseer" : "Save and publish"}
                    language={language}
                    kind="photo"
                    onProcessingChange={photoBusy}
                    onChange={(v) => {
                      setDraft((current) => {
                        if (!current) return current
                        const photos = [...(current.productPhotos || [])]
                        if (v) photos[i] = v
                        else photos.splice(i, 1)
                        return { ...current, productPhotos: photos }
                      })
                      setDirty(true)
                      setMessage("")
                    }}
                  />
                ),
              )}
            </div>
            <label htmlFor="vendor-availability">
              {af ? "Beskikbaarheid" : "Availability"}
            </label>
            <select
              id="vendor-availability"
              className="admin-input"
              value={draft.availabilityStatus}
              onChange={(e) =>
                update(
                  "availabilityStatus",
                  e.target.value as StallListing["availabilityStatus"],
                )
              }
            >
              <option value="open-today">
                {af ? "Oop / beskikbaar" : "Open / available"}
              </option>
              <option value="coming-soon">
                {af ? "Kom binnekort" : "Coming soon"}
              </option>
              <option value="closed">
                {af ? "Gesluit / nie beskikbaar nie" : "Closed / unavailable"}
              </option>
              {draft.availabilityStatus === "available-to-rent" && (
                <option value="available-to-rent">
                  {af ? "Beskikbaar om te huur" : "Available to rent"}
                </option>
              )}
            </select>
            <h2>{af ? "Saterdag-aanbiedinge" : "Saturday specials"}</h2>
            <label htmlFor="vendor-special">
              {af ? "Saterdag se aanbod" : "Saturday offer"}
            </label>
            <textarea
              id="vendor-special"
              className="admin-input"
              rows={3}
              maxLength={2000}
              value={draft.special}
              onChange={(e) => update("special", e.target.value)}
            />
            <ListingImageUpload
              id="vendor-special-photo"
              label={af ? "Aanbodfoto" : "Special photo"}
              value={draft.specialImage}
              language={language}
              kind="photo"
              onChange={(v) => update("specialImage", v)}
              onProcessingChange={photoBusy}
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.specialToday}
                onChange={(e) => update("specialToday", e.target.checked)}
              />
              {af
                ? "Publiseer my Saterdag-aanbod"
                : "Publish my Saturday special"}
            </label>
            <label htmlFor="vendor-promotion">
              {af ? "Promosie-aanbod" : "Promotional offer"}
            </label>
            <textarea
              id="vendor-promotion"
              className="admin-input"
              rows={3}
              maxLength={2000}
              value={draft.promotionalOffer || ""}
              onChange={(e) => update("promotionalOffer", e.target.value)}
            />
          </fieldset>
          <div className="vendor-save">
            <button
              className="primary-button"
              disabled={busy || uploads > 0 || !dirty}
            >
              {busy
                ? af
                  ? "Besig om te stoor…"
                  : "Saving…"
                : af
                  ? "Stoor en publiseer"
                  : "Save and publish"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  confirm(
                    af
                      ? "Gooi ongestoorde veranderinge weg?"
                      : "Discard unsaved changes?",
                  )
                )
                  setReload((v) => v + 1)
              }}
            >
              {af ? "Herlaai gestoorde besonderhede" : "Reload saved details"}
            </button>
          </div>
          {message && <p role="status">{message}</p>}
        </form>
      )}
      {error && (
        <p className="vendor-error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
