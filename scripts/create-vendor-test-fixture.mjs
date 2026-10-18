// Run with Node >=22. Creates an ignored token fixture and SQL; does not mutate the database.
// Apply .tmp-vendor-fixture.sql to a test database, run check-vendor-self-service.cjs,
// then DELETE vendor_access WHERE stall_key='qa-vendor-self-service' in the private
// schema and DELETE the matching public.bm_listings row. Never use a real vendor code.
import fs from "node:fs"
import { randomBytes, createHash } from "node:crypto"
const token = randomBytes(32).toString("hex")
const key = "qa-vendor-self-service"
const data = {
  businessName: "QA temporary vendor",
  category: "meat",
  products: [],
  whatsapp: "",
  freeListing: false,
  featured: true,
  saturdaySpecial: true,
  premium: true,
  featuredUntil: "",
  special: "",
  specialToday: false,
  availabilityStatus: "open-today",
  description: "",
  productPhotos: [],
}
const hash = createHash("sha256").update(token).digest("hex")
fs.writeFileSync(".tmp-vendor-fixture.json", JSON.stringify({ token, key }))
fs.writeFileSync(
  ".tmp-vendor-fixture.sql",
  `insert into public.bm_listings(key,number,data) values ('${key}','QA','${JSON.stringify(data)}'::jsonb); insert into boeremark_private.vendor_access(stall_key,token_hash) values ('${key}','${hash}');`,
)
console.log(
  "Temporary fixture files created. Apply the SQL only to the intended test database.",
)
