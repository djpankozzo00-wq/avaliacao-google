type CompanyInput = { name?: string; slug?: string; review_url?: string; sign_configs?: Record<string, any> }

function config() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY")
  return { url: url.replace(/\/$/, ""), key }
}

async function request(path: string, init: RequestInit = {}) {
  const { url, key } = config()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init, cache: "no-store",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(text || "Falha ao acessar o banco de dados")
  return text ? JSON.parse(text) : null
}

const columns = "id,name,slug,review_url,sign_configs,created_at,updated_at"
function defaultSignConfigs() {
  return {
    pix: { enabled: false, pix_key: "", recipient: "", city: "" },
    instagram: { enabled: false, username: "", url: "" },
    wifi: { enabled: false, network: "", password: "", security: "WPA" },
    whatsapp: { enabled: false, phone: "", message: "" },
  }
}

export async function listCompanies() {
  return request(`companies?select=${columns}&order=created_at.desc`)
}
export async function getCompany(slug: string) {
  const rows = await request(`companies?select=id,name,slug,review_url,sign_configs&slug=eq.${encodeURIComponent(slug)}&limit=1`)
  return Array.isArray(rows) ? rows[0] ?? null : null
}
export async function createCompany(input: CompanyInput) {
  const name = String(input.name ?? "").trim()
  const reviewUrl = String(input.review_url ?? "").trim()
  if (name.length < 2) throw new Error("Informe o nome da empresa.")
  if (!isGoogleReviewUrl(reviewUrl)) throw new Error("Informe um link válido de avaliação do Google.")
  const slug = `${slugify(name)}-${cryptoRandom()}`
  const rows = await request(`companies?select=${columns}`, {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name, slug, review_url: reviewUrl, sign_configs: defaultSignConfigs() }),
  })
  return rows[0]
}
export async function updateCompany(id: string, input: CompanyInput) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.review_url !== undefined) {
    const reviewUrl = String(input.review_url ?? "").trim()
    if (!isGoogleReviewUrl(reviewUrl)) throw new Error("Informe um link válido de avaliação do Google.")
    patch.review_url = reviewUrl
  }
  if (input.sign_configs !== undefined) patch.sign_configs = input.sign_configs
  const rows = await request(`companies?id=eq.${encodeURIComponent(id)}&select=${columns}`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
  })
  if (!rows?.length) throw new Error("Empresa não encontrada.")
  return rows[0]
}
export async function deleteCompany(id: string) {
  const rows = await request(`companies?id=eq.${encodeURIComponent(id)}&select=id,name`, { method: "DELETE", headers: { Prefer: "return=representation" } })
  if (!rows?.length) throw new Error("Empresa não encontrada.")
  return rows[0]
}
function isGoogleReviewUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && (url.hostname === "g.page" || url.hostname.endsWith(".google.com") || url.hostname === "google.com" || url.hostname === "maps.app.goo.gl")
  } catch { return false }
}
function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "empresa"
}
function cryptoRandom() { return Math.random().toString(36).slice(2, 7) }
