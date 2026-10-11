import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const city = (request.nextUrl.searchParams.get("city") || "").trim().slice(0, 100)
  const category = (request.nextUrl.searchParams.get("category") || "").trim().slice(0, 80)
  if (city.length < 2 || category.length < 2) {
    return NextResponse.json({ error: "Informe uma cidade e uma categoria de empresa." }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({
      q: category + ", " + city + ", Brazil",
      format: "jsonv2",
      addressdetails: "1",
      extratags: "1",
      namedetails: "1",
      limit: "30",
      countrycodes: "br",
      "accept-language": "pt-BR",
    })
    const response = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString(), {
      headers: { "User-Agent": "AvaliacaoGoogleAdmin/1.0 (business contact search)" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return NextResponse.json({ error: "A busca está temporariamente indisponível. Tente novamente." }, { status: 502 })

    const data = await response.json()
    const normalizePhone = (value: unknown) => String(value || "").split(/[;,/]/)[0].trim()
    const results = Array.isArray(data) ? data.map((item: any) => {
      const tags = item.extratags || {}
      const name = String(item.name || item.namedetails?.name || item.display_name?.split(",")[0] || "").trim()
      const address = String(item.display_name || "").trim()
      const phone = normalizePhone(tags["contact:whatsapp"] || tags.whatsapp || tags["contact:phone"] || tags.phone || tags.mobile || tags["contact:mobile"])
      const digits = phone.replace(/[^0-9]/g, "")
      const whatsappUrl = digits.length >= 10
        ? "https://wa.me/" + (digits.startsWith("55") ? digits : "55" + digits)
        : ""
      const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([name, address, city].filter(Boolean).join(", "))
      return {
        id: String(item.place_id || item.osm_id || name),
        name: name || "Estabelecimento sem nome",
        address,
        maps_url: mapsUrl,
        category: String(item.type || item.class || category).replace(/_/g, " "),
        phone,
        whatsapp_url: whatsappUrl,
      }
    }).filter((item: { name: string; address: string }) => item.name && item.address) : []

    return NextResponse.json({ results, notice: "Os contatos dependem dos dados públicos disponíveis; nem toda empresa informa WhatsApp." })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os estabelecimentos agora. Tente novamente." }, { status: 502 })
  }
}
