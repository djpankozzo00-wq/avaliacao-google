import { NextResponse } from "next/server"
import { createSign } from "node:crypto"
import { requireAdmin } from "@/lib/admin-auth"
import { getCompany } from "@/lib/companies-db"

export const runtime = "nodejs"

const OWNER = "djpankozzo00-wq"
const REPO = "avaliacao-google"

function validSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url")
}

async function getGitHubToken() {
  const appId = process.env.GITHUB_APP_ID
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID
  const privateKeyValue = process.env.GITHUB_APP_PRIVATE_KEY

  if (!appId || !installationId || !privateKeyValue) {
    throw new Error("GitHub App não configurado: defina GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID e GITHUB_APP_PRIVATE_KEY.")
  }

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 8 * 60, iss: appId }))
  const unsignedToken = `${header}.${payload}`
  const privateKey = privateKeyValue.replace(/\\n/g, "\n")
  const signer = createSign("RSA-SHA256")
  signer.update(unsignedToken)
  signer.end()
  const jwt = `${unsignedToken}.${signer.sign(privateKey).toString("base64url")}`

  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error("GitHub App installation token failed", response.status, detail)
    throw new Error("Não foi possível autenticar o GitHub App. Confira o ID, a instalação e a chave privada.")
  }

  const data = await response.json()
  if (!data.token) throw new Error("GitHub não retornou um token de instalação.")
  return data.token as string
}

async function getCompanyOrResponse(slug: string) {
  if (!validSlug(slug)) return { response: NextResponse.json({ error: "Identificador da empresa inválido." }, { status: 400 }) }
  const company = await getCompany(slug)
  if (!company) return { response: NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 }) }
  return { company }
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  try {
    const { slug } = await context.params
    const result = await getCompanyOrResponse(slug)
    if (result.response) return result.response
    const { company } = result
    const token = await getGitHubToken()

    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/build-android-apk.yml/dispatches`, {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({ ref: "main", inputs: { company_slug: company.slug, company_name: company.name } }),
      cache: "no-store",
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error("GitHub workflow dispatch failed", response.status, detail)
      return NextResponse.json({ error: "O GitHub recusou iniciar a geração do APK. Verifique as permissões do GitHub App." }, { status: 502 })
    }
    return NextResponse.json({ ok: true, message: "Geração iniciada. Aguarde a publicação do APK." }, { status: 202 })
  } catch (error) {
    console.error("Company APK dispatch error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao solicitar a geração do aplicativo." }, { status: 503 })
  }
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  try {
    const { slug } = await context.params
    const result = await getCompanyOrResponse(slug)
    if (result.response) return result.response
    const { company } = result
    const token = await getGitHubToken()
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/app-${company.slug}`, {
      headers: githubHeaders(token),
      cache: "no-store",
    })
    if (response.status === 404) return NextResponse.json({ ready: false })
    if (!response.ok) throw new Error("Falha ao consultar a publicação no GitHub.")
    const release = await response.json()
    const asset = (release.assets || []).find((item: { name: string; browser_download_url: string }) => item.name === `avaliacao-google-${company.slug}.apk`)
    return NextResponse.json({ ready: Boolean(asset), download_url: asset?.browser_download_url || null, app_name: company.name })
  } catch (error) {
    console.error("Company APK status error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível consultar o APK." }, { status: 503 })
  }
}
