import { useState } from "react"
import { rpc } from "../data/cloud"
export default function VendorAccess({
  stallKey,
  number,
  language,
}: {
  stallKey: string
  number: string
  language: "af" | "en"
}) {
  const af = language === "af"
  const [link, setLink] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  return (
    <section className="vendor-access">
      <h3>
        {af ? "Uitstaller se privaat toegang" : "Vendor private access"} ·{" "}
        {number}
      </h3>
      <p>
        {af
          ? "Deel net met hierdie uitstaller. ’n Nuwe skakel vervang enige vorige skakel."
          : "Share only with this vendor. A new link replaces any previous link."}
      </p>
      <div className="vendor-save">
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={async () => {
            if (
              !confirm(
                af
                  ? "Skep ’n nuwe skakel? Die vorige skakel sal ophou werk."
                  : "Create a new link? The previous link will stop working.",
              )
            )
              return
            setBusy(true)
            setMessage("")
            setLink("")
            try {
              const token = await rpc("bm_issue_vendor", { p_key: stallKey })
              setLink(location.origin + location.pathname + "#vendor=" + token)
            } catch (e) {
              setMessage((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {af
            ? "Skep / vervang privaat skakel"
            : "Create / replace private link"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={async () => {
            if (
              !confirm(
                af
                  ? "Herroep hierdie uitstaller se toegang?"
                  : "Revoke this vendor’s access?",
              )
            )
              return
            setBusy(true)
            try {
              await rpc("bm_revoke_vendor", { p_key: stallKey })
              setLink("")
              setMessage(af ? "Toegang herroep." : "Access revoked.")
            } catch (e) {
              setMessage((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {af ? "Herroep toegang" : "Revoke access"}
        </button>
      </div>
      {link && (
        <>
          <label htmlFor="private-vendor-link">
            {af ? "Privaat skakel" : "Private link"}
          </label>
          <input
            className="admin-input"
            id="private-vendor-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
          />
          <button
            className="secondary-button"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link)
                setMessage(af ? "Skakel gekopieer." : "Link copied.")
              } catch {
                setMessage(
                  af
                    ? "Kies en kopieer die skakel hierbo."
                    : "Select and copy the link above.",
                )
              }
            }}
          >
            {af ? "Kopieer skakel" : "Copy link"}
          </button>
          <details>
            <summary>
              {af
                ? "Wys kode vir handmatige aanmelding"
                : "Show code for manual sign-in"}
            </summary>
            <code className="vendor-code">{link.split("#vendor=")[1]}</code>
          </details>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
