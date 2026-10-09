import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const term = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100)
  if (term.length < 2) return NextResponse.json({ results: [] })

  try {
    const query = term + ", Macaúbas, Bahia, Brazil"
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "12",
      countrycodes: "br",
      "accept-language": "pt-BR",
    })
    const response = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString(), {
      headers: { "User-Agent": "AvaliacaoGoogleAdmin/1.0 (establishment search)" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return NextResponse.json({ error: "A busca de estabelecimentos está temporariamente indisponível." }, { status: 502 })

    const data = await response.json()
    const results = Array.isArray(data) ? data.map((item: any) => {
      const name = typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : String(item.display_name || "").split(",")[0].trim()
      const address = String(item.display_name || "").trim()
      const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([name, address, "Macaúbas, Bahia"].filter(Boolean).join(", "))
      return {
        id: String(item.place_id || item.osm_id || name),
        name: name || "Estabelecimento sem nome",
        address,
        maps_url: mapsUrl,
        osm_url: item.osm_type && item.osm_id ? "https://www.openstreetmap.org/" + String(item.osm_type).toLowerCase() + "/" + String(item.osm_id) : "",
        category: String(item.type || item.class || "Estabelecimento").replace(/_/g, " "),
      }
    }).filter((item: { name: string; address: string }) => item.name && item.address) : []

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os estabelecimentos agora. Tente novamente." }, { status: 502 })
  }
}
