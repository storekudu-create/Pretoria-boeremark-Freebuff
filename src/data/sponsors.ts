export type Sponsor = {
  id: string
  name: string
  website: string
  image: string
  sector: string
  tagline: string
  active: boolean
}
export const sponsorSectors = [
  "Agricultural suppliers",
  "Bakkie dealers",
  "Tyre businesses",
  "Insurance",
  "Banks",
  "Veterinary services",
  "Farm equipment",
  "Nurseries",
  "Hardware stores",
  "Solar companies",
  "Caravan / outdoor businesses",
  "Other",
]
export function safeSponsorWebsite(value: string) {
  try {
    const u = new URL(value)
    return ["https:", "http:"].includes(u.protocol) ? u.href : ""
  } catch {
    return ""
  }
}
