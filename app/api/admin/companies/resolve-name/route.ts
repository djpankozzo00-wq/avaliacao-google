import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

const ALLOWED_HOSTS = ["google.com", "www.google.com", "maps.google.com", "g.page", "goo.gl", "maps.app.goo.gl", "search.google.com"]

function allowedHost(hostname: string) {
  return ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith("." + host))
}

function cleanTitle(value: string) {
  return value
    .replace(/\\s*[-|·]\\s*Google Maps\\s*$/i, "")
    .replace(/\\s*[-|·]\\s*Google\\s*$/i, "")
    .replace(/^Google Maps\\s*[-|·:]?\\s*/i, "")
    .replace(/\\s+/g, " ")
    .trim()
}

function validName(value: string) {
  const name = cleanTitle(value)
  if (!name || /^(google( maps)?|pesquisa google|google search|sign in(?:\\s*[-|·:]\\s*google accounts)?|google accounts|login - google accounts|entrar - contas do google|sign in)$/i.test(name) || /google accounts|sign in|fazer login|entrar na conta/i.test(name)) return ""
  return name.slice(0, 120)
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

    const placeId = url.searchParams.get("placeid") || url.searchParams.get("query_place_id")
    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    // Prefer the official Google Places API when the server key is configured.
    if (placeId && apiKey) {
      try {
        const response = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "displayName",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(7000),
        })
        if (response.ok) {
          const data = await response.json()
          const name = typeof data?.displayName?.text === "string" ? validName(data.displayName.text) : ""
          if (name) return NextResponse.json({ name, source: "places-api" })
        }
      } catch {
        // If the official API is unavailable, try the public-page fallback below.
      }
    }

    const urlsToTry = placeId
      ? ["https://www.google.com/maps/search/?api=1&query_place_id=" + encodeURIComponent(placeId), url.toString()]
      : [url.toString()]
    let html = ""
    for (const candidateUrl of urlsToTry) {
      try {
        const response = await fetch(candidateUrl, {
          redirect: "follow",
          signal: AbortSignal.timeout(7000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GoogleReviewLinkHelper/1.0)" },
          cache: "no-store",
        })
        const finalUrl = new URL(response.url)
        if (!allowedHost(finalUrl.hostname.toLowerCase())) continue
        const candidateHtml = (await response.text()).slice(0, 1_000_000)
        if (candidateHtml) { html = candidateHtml; if (/og:title|<title/i.test(candidateHtml)) break }
      } catch {
        // Tenta o próximo formato de URL.
      }
    }
    if (!html) return NextResponse.json({ name: "", reason: placeId && !apiKey ? "missing_api_key" : "name_not_found" })
    const candidates = [
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1],
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1],
      html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1],
    ].filter((value): value is string => Boolean(value))

    const name = validName((candidates[0] || candidates[1] || candidates[2] || "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">"))

    if (!name) return NextResponse.json({ name: "", reason: placeId && !apiKey ? "missing_api_key" : "name_not_found" })
    return NextResponse.json({ name })
  } catch {
    return NextResponse.json({ name: "", reason: "invalid_request" })
  }
}
