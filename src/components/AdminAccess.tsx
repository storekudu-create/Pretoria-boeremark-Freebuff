import { useState, type ReactNode } from "react"
import {
  currentAdminEmail,
  hasAdminSession,
  clearAdminSession,
  sendAdminCode,
  verifyAdminCode,
} from "../data/cloud"
export default function AdminAccess({
  children,
  onBack,
  language,
}: {
  children: ReactNode
  onBack: () => void
  language: "af" | "en"
}) {
  const af = language === "af"
  const [email, setEmail] = useState(currentAdminEmail)
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [allowed, setAllowed] = useState(hasAdminSession)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  if (allowed)
    return (
      <>
        <div className="admin-session">
          <span>{email}</span>
          <button
            className="secondary-button"
            onClick={() => {
              clearAdminSession()
              setAllowed(false)
              onBack()
            }}
          >
            {af ? "Meld af" : "Sign out"}
          </button>
        </div>
        {children}
      </>
    )
  return (
    <main className="app-shell vendor-shell">
      <header className="hero">
        <h1>{af ? "Markadministrasie" : "Market administration"}</h1>
        <button className="secondary-button" onClick={onBack}>
          {af ? "Openbare kaart" : "Public map"}
        </button>
      </header>
      <form
        className="admin-card vendor-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError("")
          try {
            if (sent) {
              await verifyAdminCode(email, code)
              setAllowed(true)
            } else {
              await sendAdminCode(email.trim())
              setSent(true)
            }
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <p>
          {af
            ? "Slegs goedgekeurde markbestuur kan uitstaller-skakels uitreik."
            : "Only approved market administrators can issue vendor links."}
        </p>
        <label htmlFor="admin-email">
          {af ? "Administrateur se e-pos" : "Administrator email"}
        </label>
        <input
          className="admin-input"
          id="admin-email"
          type="email"
          required
          value={email}
          disabled={sent || busy}
          onChange={(e) => setEmail(e.target.value)}
        />
        {sent && (
          <>
            <p>
              {af
                ? "Kyk in jou e-pos. Kopieer die aanmeldskakel se adres (moenie dit oopmaak nie) en plak dit hieronder. ’n E-poskode werk ook."
                : "Check your email. Copy the sign-in link address (without opening it) and paste it below. An emailed code also works."}
            </p>
            <label htmlFor="admin-code">
              {af ? "E-posskakel of kode" : "Email link or code"}
            </label>
            <input
              className="admin-input"
              id="admin-code"
              type="password"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </>
        )}
        <button className="primary-button" disabled={busy}>
          {busy
            ? "…"
            : sent
              ? af
                ? "Meld aan"
                : "Sign in"
              : af
                ? "Stuur aanmeld-e-pos"
                : "Send sign-in email"}
        </button>
        {sent && (
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              setSent(false)
              setCode("")
            }}
          >
            {af
              ? "Gebruik ander e-pos / stuur weer"
              : "Use another email / resend"}
          </button>
        )}
        {error && (
          <p role="alert" className="vendor-error">
            {error}
          </p>
        )}
      </form>
    </main>
  )
}
