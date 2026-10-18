import { useState } from "react"
import ListingImageUpload from "./ListingImageUpload"
import { sponsorSectors, type Sponsor } from "../data/sponsors"
import { uploadMarketImage } from "../data/cloud"
export default function SponsorEditor({
  sponsors,
  revision,
  language,
  onSave,
}: {
  sponsors: Sponsor[]
  revision: number
  language: "af" | "en"
  onSave: (sponsors: Sponsor[], revision: number) => Promise<void>
}) {
  const af = language === "af"
  const [draft, setDraft] = useState(sponsors.map((s) => ({ ...s })))
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState(0)
  const [message, setMessage] = useState("")
  const change = (
    id: string,
    field: keyof Sponsor,
    value: string | boolean,
  ) => {
    setDraft((rows) =>
      rows.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    )
    setMessage("")
  }
  return (
    <section className="admin-card sponsor-editor">
      <h2>
        {af
          ? "Buiteborge · Kaartadvertensies"
          : "Outside sponsors · Map advertising"}
      </h2>
      <p>
        {af
          ? "Borge hoef nie stalletjiehouers te wees nie. Die vertikale advertensies verskyn links binne die kaart."
          : "Sponsors do not need to be stallholders. The vertical advertisements appear on the left inside the map."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (busy || uploads) return
          setBusy(true)
          setMessage("")
          try {
            const saved = await Promise.all(
              draft.map(async (s) => ({
                ...s,
                name: s.name.trim(),
                website: s.website.trim(),
                image: await uploadMarketImage(s.image, "sponsors"),
              })),
            )
            await onSave(saved, revision)
            setDraft(saved)
            setMessage(
              af
                ? "Borge gestoor en gepubliseer."
                : "Sponsors saved and published.",
            )
          } catch (e) {
            setMessage((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <fieldset disabled={busy} className="sponsor-fields">
          {draft.map((s, i) => (
            <section className="sponsor-edit-row" key={s.id}>
              <h3>
                {af ? "Borg " : "Sponsor "}
                {i + 1}
              </h3>
              <label htmlFor={"sponsor-name-" + s.id}>
                {af ? "Besigheidsnaam" : "Business name"}
              </label>
              <input
                className="admin-input"
                id={"sponsor-name-" + s.id}
                value={s.name}
                maxLength={100}
                required
                onChange={(e) => change(s.id, "name", e.target.value)}
              />
              <label htmlFor={"sponsor-website-" + s.id}>
                {af ? "Borg se webwerf" : "Sponsor website"}
              </label>
              <input
                className="admin-input"
                id={"sponsor-website-" + s.id}
                type="url"
                placeholder="https://…"
                value={s.website}
                maxLength={500}
                required
                onChange={(e) => change(s.id, "website", e.target.value)}
              />
              <label htmlFor={"sponsor-sector-" + s.id}>
                {af ? "Besigheidstipe" : "Business type"}
              </label>
              <select
                className="admin-input"
                id={"sponsor-sector-" + s.id}
                value={s.sector}
                onChange={(e) => change(s.id, "sector", e.target.value)}
              >
                {sponsorSectors.map((sector) => (
                  <option key={sector}>{sector}</option>
                ))}
              </select>
              <label htmlFor={"sponsor-tagline-" + s.id}>
                {af ? "Kort boodskap (opsioneel)" : "Short message (optional)"}
              </label>
              <input
                className="admin-input"
                id={"sponsor-tagline-" + s.id}
                value={s.tagline}
                maxLength={100}
                onChange={(e) => change(s.id, "tagline", e.target.value)}
              />
              <ListingImageUpload
                id={"sponsor-image-" + s.id}
                label={
                  af
                    ? "Advertensieprent of logo"
                    : "Advertisement image or logo"
                }
                value={s.image}
                language={language}
                kind="photo"
                saveLabel={af ? "Stoor borge" : "Save sponsors"}
                onChange={(v) => change(s.id, "image", v)}
                onProcessingChange={(b) =>
                  setUploads((n) => Math.max(0, n + (b ? 1 : -1)))
                }
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={(e) => change(s.id, "active", e.target.checked)}
                />
                {af ? "Wys op die kaart" : "Show on the map"}
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setDraft((rows) => rows.filter((row) => row.id !== s.id))
                  setMessage("")
                }}
              >
                {af ? "Verwyder borg" : "Remove sponsor"}
              </button>
            </section>
          ))}
        </fieldset>
        <div className="vendor-save">
          <button
            className="secondary-button"
            type="button"
            disabled={busy || draft.length >= 6}
            onClick={() =>
              setDraft((rows) => [
                ...rows,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  website: "",
                  image: "",
                  sector: sponsorSectors[0],
                  tagline: "",
                  active: true,
                },
              ])
            }
          >
            {af ? "Voeg borg by" : "Add sponsor"}
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={busy || uploads > 0}
          >
            {busy
              ? af
                ? "Besig om te stoor…"
                : "Saving…"
              : af
                ? "Stoor borge"
                : "Save sponsors"}
          </button>
        </div>
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}
