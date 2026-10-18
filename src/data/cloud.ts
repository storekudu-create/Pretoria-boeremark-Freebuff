import type { Sponsor } from "./sponsors"
import {
  type ListingsByKey,
  type StallListing,
  type TodaySpecial,
} from "./listings"
export const DATABASE_URL = "https://sflktwotveoltsdlkhrm.supabase.co"
// This is a public client key. Database policies and RPC authorization protect writes.
const PUBLIC_KEY = "sb_publishable_hpAzfMWmXC9gxNdZ6lOCQQ_Ww3ncvcM"
let adminToken = ""
let adminEmail = ""
export const currentAdminEmail = () => adminEmail
export const hasAdminSession = () => Boolean(adminToken)
export function clearAdminSession() {
  adminToken = ""
  adminEmail = ""
}
async function request(path: string, body?: unknown, auth = adminToken) {
  const response = await fetch(DATABASE_URL + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      apikey: PUBLIC_KEY,
      ...(auth ? { Authorization: "Bearer " + auth } : {}),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  })
  const data = await response.json().catch(() => null)
  if (response.status === 401 && auth) {
    clearAdminSession()
    throw new Error(
      "Your administrator session expired. Return to the map and sign in again.",
    )
  }
  if (!response.ok)
    throw new Error(
      data?.message ||
        data?.msg ||
        data?.error_description ||
        "Unable to connect. Please retry.",
    )
  return data
}
export const rpc = (name: string, body: unknown = {}) =>
  request("/rest/v1/rpc/" + name, body)
export async function fetchMarket(): Promise<{
  listings: ListingsByKey
  specials: TodaySpecial[]
  sponsors: Sponsor[]
  sponsorsRevision: number
  publicAdministration: boolean
}> {
  const [rows, settings] = await Promise.all([
    request(
      "/rest/v1/bm_listings?select=key,number,data,revision&order=key",
      undefined,
      "",
    ),
    request(
      "/rest/v1/bm_settings?id=eq.1&select=specials,sponsors,sponsors_revision,public_administration",
      undefined,
      "",
    ),
  ])
  return {
    listings: Object.fromEntries(
      rows.map(
        (r: {
          key: string
          number: string
          data: StallListing
          revision: number
        }) => [
          r.key,
          { ...r.data, key: r.key, number: r.number, revision: r.revision },
        ],
      ),
    ),
    specials: settings[0]?.specials ?? [],
    sponsors: settings[0]?.sponsors ?? [],
    sponsorsRevision: settings[0]?.sponsors_revision ?? 1,
    publicAdministration: settings[0]?.public_administration === true,
  }
}
export async function sendAdminCode(email: string) {
  await request("/auth/v1/otp", { email, create_user: true }, "")
}
export async function verifyAdminCode(email: string, code: string) {
  let payload: Record<string, string> = {
    email: email.trim(),
    token: code.trim(),
    type: "email",
  }
  if (code.trim().startsWith("https://")) {
    const link = new URL(code.trim())
    if (link.origin !== DATABASE_URL || !link.searchParams.get("token"))
      throw new Error("Paste the sign-in link from the market email.")
    payload = { token_hash: link.searchParams.get("token")!, type: "email" }
  }
  const result = await request("/auth/v1/verify", payload, "")
  adminToken = result.access_token
  adminEmail = email.trim()
  try {
    if ((await rpc("bm_is_admin")) !== true)
      throw new Error("This email does not have market-administrator access.")
  } catch (error) {
    clearAdminSession()
    throw error
  }
}
export const getVendorListing = (token: string): Promise<StallListing> =>
  request("/rest/v1/rpc/bm_vendor_get", { p_token: token }, "")
const vendorFields = [
  "businessName",
  "description",
  "logoImage",
  "whatsapp",
  "products",
  "productPhotos",
  "special",
  "specialImage",
  "specialToday",
  "availabilityStatus",
  "promotionalOffer",
  "website",
] as const
export async function uploadMarketImage(
  image: string | undefined,
  key: string,
  token?: string,
): Promise<string> {
  if (!image) return ""
  if (!image.startsWith("data:")) return image
  const blob = await (await fetch(image)).blob()
  const res = await fetch(DATABASE_URL + "/functions/v1/market-media", {
    method: "POST",
    headers: {
      apikey: PUBLIC_KEY,
      "Content-Type": blob.type,
      "x-stall-key": key,
      ...(token
        ? { "x-vendor-code": token }
        : adminToken
          ? { Authorization: "Bearer " + adminToken }
          : {}),
    },
    body: blob,
    signal: AbortSignal.timeout(60_000),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.message || "Unable to upload photo")
  return result.url
}

export async function uploadListingImages(
  listing: StallListing,
  token?: string,
): Promise<StallListing> {
  const upload = (image?: string) =>
    uploadMarketImage(image, listing.key, token)
  return {
    ...listing,
    logoImage: await upload(listing.logoImage),
    specialImage: await upload(listing.specialImage),
    productPhotos: await Promise.all((listing.productPhotos ?? []).map(upload)),
  }
}
export async function saveVendorListing(
  token: string,
  listing: StallListing,
): Promise<StallListing> {
  const content = await uploadListingImages(listing, token)
  const data = Object.fromEntries(
    vendorFields
      .filter((k) => content[k] !== undefined)
      .map((k) => [k, content[k]]),
  )
  return request(
    "/rest/v1/rpc/bm_vendor_save",
    { p_token: token, p_data: data, p_revision: listing.revision },
    "",
  )
}
export async function saveAdminListing(
  listing: StallListing,
): Promise<StallListing> {
  const content = await uploadListingImages(listing)
  const { key, number: _number, revision, ...data } = content
  return rpc("bm_admin_save", {
    p_key: key,
    p_data: data,
    p_revision: revision,
  })
}
