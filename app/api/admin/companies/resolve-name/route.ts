import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

const ALLOWED_HOSTS = ["google.com", "www.google.com", "maps.google.com", "g.page", "goo.gl", "maps.app.goo.gl", "search.google.com"]

function allowedHost(hostname: string) {
  return ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith("." + host))
}

function cleanTitle(value: string) {
  return value
    .replace(/\s*[-|·]\s*Google Maps\s*$/i, "")
    .replace(/\s*[-|·]\s*Google\s*$/i, "")
    .replace(/^Google Maps\s*[-|·:]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  try {
    const { review_url } = await request.json()
    if (typeof review_url !== "string") return NextResponse.json({ error: "Informe um link válido." }, { status: 400 })

    const url = new URL(review_url)
    if (url.protocol !== "https:" || !allowedHost(url.hostname.toLowerCase())) {
      return NextResponse.json({ error: "Use um link oficial do Google." }, { status: 400 })
    }

    const response = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoogleReviewLinkHelper/1.0)" },
      cache: "no-store",
    })
    const finalUrl = new URL(response.url)
    if (!allowedHost(finalUrl.hostname.toLowerCase())) {
      return NextResponse.json({ name: "" })
    }

    const html = (await response.text()).slice(0, 1_000_000)
    const candidates = [
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1],
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1],
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    ].filter((value): value is string => Boolean(value))

    const name = cleanTitle((candidates[0] || candidates[1] || candidates[2] || "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">"))

    if (!name || /^(google( maps)?|pesquisa google|google search|sign in(?:\s*[-|·:]\s*google accounts)?|google accounts|login - google accounts|entrar - contas do google|sign in)$/i.test(name) || /google accounts|sign in|fazer login|entrar na conta/i.test(name)) {
      return NextResponse.json({ name: "" })
    }
    return NextResponse.json({ name: name.slice(0, 120) })
  } catch {
    return NextResponse.json({ name: "" })
  }
}
