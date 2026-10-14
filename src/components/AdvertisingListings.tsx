import { useState } from "react"
import { isFeaturedActive, type StallListing } from "../data/listings"

type Props = {
  listings: StallListing[]
  language: "af" | "en"
  showSaturdaySpecials: boolean
  onSelect: (key: string) => void
}

export default function AdvertisingListings({ listings, language, showSaturdaySpecials, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const af = language === "af"
  const groups = [
    { id: "premium", title: "Premium", description: af ? "Ontdek ons premium stalletjies" : "Discover our premium stalls", items: listings.filter((listing) => listing.premium) },
    { id: "featured", title: af ? "Uitgelig" : "Featured", description: af ? "Stalletjies in die kollig" : "Stalls in the spotlight", items: listings.filter((listing) => isFeaturedActive(listing)) },
    ...(showSaturdaySpecials ? [{ id: "saturday", title: af ? "Saterdag-aanbod" : "Saturday Special", description: af ? "Aanbiedinge van ons stalletjies" : "Offers from our stalls", items: listings.filter((listing) => listing.saturdaySpecial) }] : []),
    { id: "free", title: af ? "Gratis lysings" : "Free listings", description: af ? "Verken die mark se besighede" : "Explore businesses at the market", items: listings.filter((listing) => listing.freeListing) },
  ]

  return (
    <div className="advertising-listings">
      {groups.map((group) => (
        <section className={"advertising-section advertising-" + group.id} key={group.id} aria-labelledby={"advertising-title-" + group.id}>
          <div className="advertising-heading">
            <div>
              <h2 id={"advertising-title-" + group.id}>{group.title} <span>({group.items.length})</span></h2>
              <p>{group.description}</p>
            </div>
          </div>
          {group.items.length === 0 ? (
            <p className="advertising-empty">{af ? "Geen lysings pas tans by hierdie afdeling en jou filters nie." : "No listings currently match this section and your filters."}</p>
          ) : (
            <ul className="advertising-grid">
              {(expanded[group.id] ? group.items : group.items.slice(0, 6)).map((listing) => (
                <li key={listing.key}>
                  <button type="button" className="advertising-stall" data-ad-stall-key={listing.key} onClick={() => onSelect(listing.key)}>
                    {group.id === "premium" && listing.specialImage && (
                      <img className="advertising-cover" src={listing.specialImage} alt="" loading="lazy" />
                    )}
                    <div className="advertising-stall-body">
                      {listing.logoImage ? <img className="advertising-logo" src={listing.logoImage} alt="" loading="lazy" /> : <span className="advertising-stall-number">{listing.number}</span>}
                      <div className="advertising-copy">
                        <strong>{listing.businessName || (af ? "Stalletjie " : "Stall ") + listing.number}</strong>
                        <span>{af ? "Stalletjie " : "Stall "}{listing.number}</span>
                        {group.id === "saturday" && listing.specialImage && <img className="advertising-offer-photo" src={listing.specialImage} alt="" loading="lazy" />}
                        {group.id !== "free" && listing.special && <p className="advertising-offer">{listing.special}</p>}
                        {listing.products.length > 0 && <p>{listing.products.slice(0, 3).join(" · ")}</p>}
                        <span className="advertising-view">{af ? "Bekyk stalletjie →" : "View stall →"}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {group.items.length > 6 && (
            <button type="button" className="secondary-button advertising-show-more" aria-expanded={Boolean(expanded[group.id])}
              onClick={() => setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))}>
              {expanded[group.id] ? (af ? "Wys minder" : "Show fewer") : (af ? "Wys al " : "Show all ") + group.items.length}
            </button>
          )}
        </section>
      ))}
    </div>
  )
}
