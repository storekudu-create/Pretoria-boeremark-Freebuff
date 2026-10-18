import { useEffect, useRef, useState } from "react"

type Props = {
  id: string
  label: string
  value?: string
  language: "af" | "en"
  kind: "logo" | "photo"
  saveLabel?: string
  onChange: (value: string) => void
  onProcessingChange: (busy: boolean) => void
}

async function prepareImage(file: File, maxDimension: number): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("format")
  if (file.size > 10 * 1024 * 1024) throw new Error("size")
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("decode")
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/webp", 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function ListingImageUpload({ id, label, value, language, kind, saveLabel, onChange, onProcessingChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const active = useRef(true)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  const af = language === "af"

  return (
    <div className="listing-image-field">
      <label className="field-label" htmlFor={id}>{label}</label>
      {value ? (
        <img className={"admin-image-preview " + kind} src={value} alt={label} />
      ) : (
        <div className={"image-placeholder " + kind}>
          {af ? "Nog geen prent nie" : "No image yet"}
        </div>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={id + "-help"}
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return
          setBusy(true)
          setError("")
          onProcessingChange(true)
          try {
            const data = await prepareImage(file, kind === "logo" ? 400 : 1000)
            if (active.current) onChange(data)
          } catch (problem) {
            if (active.current) {
              const reason = problem instanceof Error ? problem.message : "decode"
              setError(reason === "size"
                ? (af ? "Kies ’n prent kleiner as 10 MB." : "Choose an image smaller than 10 MB.")
                : (af ? "Kies asseblief ’n geldige JPG-, PNG- of WebP-prent." : "Please choose a valid JPG, PNG or WebP image."))
            }
          } finally {
            if (active.current) setBusy(false)
            onProcessingChange(false)
          }
        }}
      />
      <p id={id + "-help"} className="image-upload-help">
        {af ? "JPG, PNG of WebP · Maks. 10 MB. Klik " + (saveLabel ?? "Stoor lysing") + " om te behou." : "JPG, PNG or WebP · Max. 10 MB. Click " + (saveLabel ?? "Save listing") + " to keep changes."}
      </p>
      {busy && <p role="status">{af ? "Berei prent voor…" : "Preparing image…"}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {value && (
        <button type="button" className="secondary-button" disabled={busy} onClick={() => { onChange(""); setError(""); if (input.current) input.current.value = "" }}>
          {af ? "Verwyder prent" : "Remove image"}
        </button>
      )}
    </div>
  )
}
