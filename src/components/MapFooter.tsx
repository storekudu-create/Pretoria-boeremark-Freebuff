import { useEffect, useRef, useState, type ReactNode } from "react"
export default function MapFooter({
  language,
  legend,
  information,
  hidden,
}: {
  language: "af" | "en"
  legend: ReactNode
  information: ReactNode
  hidden: boolean
}) {
  const af = language === "af"
  const [panel, setPanel] = useState<"legend" | "information" | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialog.current
    if (!el || !panel || hidden) return
    el.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      el.close()
      document.body.style.overflow = old
    }
  }, [panel, hidden])
  if (hidden) return null
  return (
    <footer className="map-footer">
      <nav
        className="floating-footer-pill"
        aria-label={af ? "Kaartinligting" : "Map information"}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={panel === "legend"}
          onClick={() => setPanel("legend")}
        >
          <span aria-hidden="true">◈</span>
          {af ? "Kaartlegende" : "Map legend"}
        </button>
        <span className="footer-pill-divider" aria-hidden="true" />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={panel === "information"}
          onClick={() => setPanel("information")}
        >
          <span aria-hidden="true">ⓘ</span>
          {af ? "Markinligting" : "Market information"}
        </button>
      </nav>
      <dialog
        className="footer-information-dialog"
        ref={dialog}
        aria-label={
          panel === "legend"
            ? af
              ? "Kaartlegende"
              : "Map legend"
            : af
              ? "Markinligting"
              : "Market information"
        }
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPanel(null)
          if ((e.target as HTMLElement).closest(".feature-link")) {
            setPanel(null)
            document
              .querySelector(".map-card")
              ?.scrollIntoView({ block: "start" })
          }
        }}
      >
        <div className="footer-dialog-toolbar">
          <strong>
            {panel === "legend"
              ? af
                ? "Kaartlegende"
                : "Map legend"
              : af
                ? "Markinligting"
                : "Market information"}
          </strong>
          <button
            className="secondary-button"
            type="button"
            autoFocus
            onClick={() => setPanel(null)}
          >
            {af ? "Sluit" : "Close"} ×
          </button>
        </div>
        {panel === "legend" ? legend : information}
      </dialog>
    </footer>
  )
}
