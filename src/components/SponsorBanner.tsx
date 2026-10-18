import type { Sponsor } from "../data/sponsors"
import { safeSponsorWebsite } from "../data/sponsors"
export default function SponsorBanner({
  sponsors,
  language,
}: {
  sponsors: Sponsor[]
  language: "af" | "en"
}) {
  const af = language === "af"
  const active = sponsors.filter(
    (s) => s.active && safeSponsorWebsite(s.website),
  )
  return (
    <aside
      className="map-sponsor-rail"
      aria-label={af ? "Kaartborge" : "Map sponsors"}
    >
      <p className="sponsor-eyebrow">{af ? "ONS BORGE" : "OUR SPONSORS"}</p>
      <p className="sponsor-intro">
        {af
          ? "Interaktiewe Boeremark-kaart met trots geborg deur"
          : "Interactive Boeremark Map proudly sponsored by"}
      </p>
      {active.length ? (
        <div className="map-sponsor-list">
          {active.map((s) => (
            <a
              key={s.id}
              className="map-sponsor-tile"
              href={safeSponsorWebsite(s.website)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              aria-label={
                s.name +
                (af
                  ? " — besoek borg se webwerf (nuwe oortjie)"
                  : " — visit sponsor website (new tab)")
              }
            >
              {s.image ? (
                <img src={s.image} alt={s.name} loading="lazy" />
              ) : (
                <span className="sponsor-monogram" aria-hidden="true">
                  {s.name.slice(0, 1)}
                </span>
              )}
              <strong>{s.name}</strong>
              {s.tagline && (
                <span className="sponsor-tagline">{s.tagline}</span>
              )}
              <span className="sponsor-visit">
                {af ? "Besoek webwerf ↗" : "Visit website ↗"}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="sponsor-vacancy">
          <span aria-hidden="true">✦</span>
          <strong>{af ? "Jou besigheid hier" : "Your business here"}</strong>
          <p>
            {af
              ? "Borg die kaart. Kontak markbestuur."
              : "Sponsor the map. Contact market management."}
          </p>
        </div>
      )}
    </aside>
  )
}
