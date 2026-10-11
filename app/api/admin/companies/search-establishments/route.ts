import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function categoryVariants(category: string) {
  const normalized = category.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  const aliases: Record<string, string[]> = {
    restaurante: ["restaurant", "restaurante", "food"],
    restaurantes: ["restaurant", "restaurante", "food"],
    barbearia: ["barber", "barbearia", "hairdresser"],
    barbearias: ["barber", "barbearia", "hairdresser"],
    lanchonete: ["fast food", "lanchonete", "restaurant"],
    pizzaria: ["pizzeria", "pizzaria", "restaurant"],
    mercado: ["supermarket", "mercado", "convenience"],
    supermercado: ["supermarket", "supermercado", "grocery"],
    farmacia: ["pharmacy", "farmacia", "drugstore"],
    "salao de beleza": ["beauty salon", "hairdresser", "salao de beleza"],
    "oficina mecanica": ["car repair", "mechanic", "oficina mecanica"],
    hotel: ["hotel", "guest house", "hostel"],
    padaria: ["bakery", "padaria", "pastry"],
    academia: ["fitness centre", "gym", "academia"],
    loja: ["shop", "store", "loja"],
  }
  return [...new Set(aliases[normalized] || [category, category.toLocaleLowerCase("pt-BR")])].slice(0, 3)
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const city = (request.nextUrl.searchParams.get("city") || "").trim().slice(0, 100)
  const category = (request.nextUrl.searchParams.get("category") || "").trim().slice(0, 80)
  if (city.length < 2 || category.length < 2) {
    return NextResponse.json({ error: "Informe uma cidade e uma categoria de empresa." }, { status: 400 })
  }

  try {
    const variants = categoryVariants(category)
    const allItems: any[] = []
    const sourceErrors: string[] = []

    // O serviço público do Nominatim pede uso moderado: no máximo uma requisição por segundo.
    for (let index = 0; index < variants.length; index++) {
      if (index > 0) await pause(1100)
      const params = new URLSearchParams({
        q: variants[index] + ", " + city + ", Brazil",
        format: "jsonv2",
        addressdetails: "1",
        extratags: "1",
        namedetails: "1",
        limit: "40",
        countrycodes: "br",
        "accept-language": "pt-BR",
      })
      try {
        const response = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString(), {
          headers: { "User-Agent": "AvaliacaoGoogleAdmin/1.0 (business contact search)" },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        })
        if (!response.ok) {
          sourceErrors.push("OpenStreetMap retornou erro em uma das buscas.")
          continue
        }
        const data = await response.json()
        if (Array.isArray(data)) allItems.push(...data)
      } catch {
        sourceErrors.push("Uma das consultas ao OpenStreetMap falhou.")
      }
    }

    const normalize = (value: unknown) => String(value || "").trim()
    const normalizePhone = (value: unknown) => normalize(value).split(/[;,/]/)[0].trim()
    const seen = new Set<string>()
    const results = allItems.map((item: any) => {
      const tags = item.extratags || {}
      const name = normalize(item.name || item.namedetails?.name || item.display_name?.split(",")[0])
      const address = normalize(item.display_name)
      const phone = normalizePhone(tags["contact:whatsapp"] || tags.whatsapp || tags["contact:phone"] || tags.phone || tags.mobile || tags["contact:mobile"])
      const digits = phone.replace(/[^0-9]/g, "")
      const whatsappUrl = digits.length >= 10
        ? "https://wa.me/" + (digits.startsWith("55") ? digits : "55" + digits)
        : ""
      const osmKey = item.osm_type && item.osm_id ? String(item.osm_type) + ":" + String(item.osm_id) : ""
      const nameKey = name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
      const addressKey = address.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").slice(0, 100)
      const dedupeKey = osmKey || nameKey + "|" + addressKey
      return {
        id: String(item.place_id || osmKey || dedupeKey),
        dedupeKey,
        name: name || "Estabelecimento sem nome",
        address,
        maps_url: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([name, address, city].filter(Boolean).join(", ")),
        category: normalize(item.type || item.class || category).replace(/_/g, " "),
        phone,
        whatsapp_url: whatsappUrl,
      }
    }).filter((item: any) => {
      if (!item.name || !item.address || !item.dedupeKey) return false
      if (seen.has(item.dedupeKey)) return false
      seen.add(item.dedupeKey)
      return true
    }).map(({ dedupeKey: _dedupeKey, ...item }: any) => item)

    return NextResponse.json({
      results,
      sources: ["OpenStreetMap / Nominatim"],
      searchesPerformed: variants.length,
      notice: sourceErrors.length
        ? "Busca ampliada concluída parcialmente. " + sourceErrors[0] + " Os dados do OpenStreetMap são comunitários; telefone e WhatsApp só aparecem quando publicados nos dados consultados."
        : "Busca ampliada em " + variants.length + " consultas e resultados duplicados removidos. O OpenStreetMap é comunitário e pode não conter todas as empresas da cidade; telefones e WhatsApp só aparecem quando publicados nos dados consultados.",
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os estabelecimentos agora. Tente novamente." }, { status: 502 })
  }
}
