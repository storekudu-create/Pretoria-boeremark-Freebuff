// Upload authorization is checked against the live database on every request.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-vendor-code, x-stall-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
Deno.serve(async (req: Request) => {
  const reply = (status: number, message: string) =>
    new Response(JSON.stringify({ message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })
  if (req.method !== "POST") return reply(405, "Method not allowed")
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const vendor = req.headers.get("x-vendor-code")
    let key = req.headers.get("x-stall-key") || ""
    if (vendor) {
      const access = await fetch(url + "/rest/v1/rpc/bm_vendor_get", {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: vendor }),
      })
      if (!access.ok) return reply(401, "Invalid or revoked vendor code")
      const listing = await access.json()
      if (key !== listing.key) return reply(403, "Wrong stall")
    } else {
      const access = await fetch(url + "/rest/v1/rpc/bm_is_admin", {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: req.headers.get("authorization") || "",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
      if (!access.ok || (await access.json()) !== true)
        return reply(403, "Administrator access required")
      if (key !== "sponsors") {
        const stall = await fetch(
          url +
            "/rest/v1/bm_listings?key=eq." +
            encodeURIComponent(key) +
            "&select=key",
          { headers: { apikey: anon } },
        )
        if (!stall.ok || (await stall.json()).length !== 1)
          return reply(400, "Unknown stall")
      }
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) return reply(400, "Invalid stall")
    const type = req.headers.get("content-type") || ""
    if (!["image/jpeg", "image/png", "image/webp"].includes(type))
      return reply(400, "Use JPG, PNG or WebP")
    if (Number(req.headers.get("content-length")) > 1048576)
      return reply(413, "Photo exceeds 1 MB")
    const reader = req.body?.getReader()
    if (!reader) return reply(400, "Missing photo")
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.length
      if (total > 1048576) {
        await reader.cancel()
        return reply(413, "Photo exceeds 1 MB")
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      bytes.set(c, offset)
      offset += c.length
    }
    const ascii = (start: number, end: number) =>
      String.fromCharCode(...bytes.slice(start, end))
    const valid =
      type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : type === "image/png"
          ? bytes[0] === 137 && ascii(1, 4) === "PNG"
          : ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
    if (!valid) return reply(400, "Invalid photo file")
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const path =
      key +
      "/" +
      hash +
      "." +
      (type === "image/jpeg" ? "jpg" : type.split("/")[1])
    const upload = await fetch(
      url + "/storage/v1/object/market-media/" + path,
      {
        method: "POST",
        headers: {
          apikey: service,
          Authorization: "Bearer " + service,
          "Content-Type": type,
          "Cache-Control": "max-age=31536000",
          "x-upsert": "true",
        },
        body: bytes,
      },
    )
    if (!upload.ok) return reply(502, "Photo upload failed. Please retry.")
    return new Response(
      JSON.stringify({
        url: url + "/storage/v1/object/public/market-media/" + path,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    )
  } catch {
    return reply(500, "Unable to upload photo. Please retry.")
  }
})
