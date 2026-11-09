import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getCompany } from "@/lib/companies-db"

const OWNER = "djpankozzo00-wq"
const REPO = "avaliacao-google"

function validSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60
}

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const token = process.env.GITHUB_ACTIONS_TOKEN
  if (!token) return NextResponse.json({ error: "Configure GITHUB_ACTIONS_TOKEN nas variáveis do Vercel para habilitar a geração de APK." }, { status: 503 })

  try {
    const { slug } = await context.params
    if (!validSlug(slug)) return NextResponse.json({ error: "Identificador da empresa inválido." }, { status: 400 })
    const company = await getCompany(slug)
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 })

    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/build-android-apk.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ ref: "main", inputs: { company_slug: company.slug, company_name: company.name } }),
      cache: "no-store",
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error("GitHub workflow dispatch failed", response.status, detail)
      return NextResponse.json({ error: "Não foi possível iniciar a geração do APK no GitHub." }, { status: 502 })
    }
    return NextResponse.json({ ok: true, message: "Geração iniciada. Aguarde a publicação do APK." }, { status: 202 })
  } catch (error) {
    console.error("Company APK dispatch error", error)
    return NextResponse.json({ error: "Erro ao solicitar a geração do aplicativo." }, { status: 500 })
  }
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const token = process.env.GITHUB_ACTIONS_TOKEN
  if (!token) return NextResponse.json({ error: "Configure GITHUB_ACTIONS_TOKEN no Vercel." }, { status: 503 })
  try {
    const { slug } = await context.params
    if (!validSlug(slug)) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 })
    const company = await getCompany(slug)
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 })
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/app-${company.slug}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store",
    })
    if (response.status === 404) return NextResponse.json({ ready: false })
    if (!response.ok) throw new Error("Falha ao consultar a publicação no GitHub.")
    const release = await response.json()
    const asset = (release.assets || []).find((item: { name: string; browser_download_url: string }) => item.name === `avaliacao-google-${company.slug}.apk`)
    return NextResponse.json({ ready: Boolean(asset), download_url: asset?.browser_download_url || null, app_name: company.name })
  } catch (error) {
    console.error("Company APK status error", error)
    return NextResponse.json({ error: "Não foi possível consultar o APK." }, { status: 502 })
  }
}
