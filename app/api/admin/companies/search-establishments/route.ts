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

function makeResult(item: any, city: string, category: string, source: "Google Maps" | "OpenStreetMap") {
  const normalize = (value: unknown) => String(value || "").trim()
  const phone = normalize(item.phone || item.nationalPhoneNumber || item.internationalPhoneNumber || item.tags?.["contact:whatsapp"] || item.tags?.whatsapp || item.tags?.["contact:phone"] || item.tags?.phone || item.tags?.mobile || item.tags?.["contact:mobile"])
  const digits = phone.replace(/[^0-9]/g, "")
  const whatsappUrl = digits.length >= 10 ? "https://wa.me/" + (digits.startsWith("55") ? digits : "55" + digits) : ""
  const name = normalize(item.name || item.displayName?.text || item.namedetails?.name || item.display_name?.split(",")[0])
  const address = normalize(item.address || item.formattedAddress || item.display_name)
  const stableId = normalize(item.id || (item.osm_type && item.osm_id ? item.osm_type + ":" + item.osm_id : item.place_id))
  const nameKey = name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
  const addressKey = address.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").slice(0, 100)
  return {
    id: stableId || nameKey + "|" + addressKey,
    dedupeKey: (source === "Google Maps" ? "g:" : "o:") + (stableId || nameKey + "|" + addressKey),
    mergeKey: nameKey + "|" + addressKey,
    name: name || "Estabelecimento sem nome",
    address,
    maps_url: normalize(item.googleMapsUri) || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([name, address, city].filter(Boolean).join(", ")),
    category: normalize(item.primaryTypeDisplayName?.text || item.primaryType || item.types?.[0] || item.type || item.class || category).replace(/_/g, " "),
    phone,
    whatsapp_url: whatsappUrl,
    source,
  }
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const city = (request.nextUrl.searchParams.get("city") || "").trim().slice(0, 100)
  const category = (request.nextUrl.searchParams.get("category") || "").trim().slice(0, 80)
  const whatsappOnly = request.nextUrl.searchParams.get("whatsappOnly") === "true"
  if (city.length < 2 || category.length < 2) {
    return NextResponse.json({ error: "Informe uma cidade e uma categoria de empresa." }, { status: 400 })
  }

  try {
    const variants = categoryVariants(category)
    const allItems: any[] = []
    const sources: string[] = []
    const sourceErrors: string[] = []
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY

    // Google Places API (New). A chave fica apenas no servidor.
    if (apiKey) {
      for (const variant of variants) {
        try {
          const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.primaryType,places.primaryTypeDisplayName,places.types",
            },
            body: JSON.stringify({ textQuery: variant + " em " + city + ", Brasil", languageCode: "pt-BR", regionCode: "BR", pageSize: 20 }),
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
          })
          if (!response.ok) {
            sourceErrors.push("Google Places não respondeu corretamente. Confira a chave, faturamento e se a Places API está ativada.")
            break
          }
          const data = await response.json()
          if (Array.isArray(data.places)) allItems.push(...data.places.map((item: any) => ({ ...item, _source: "Google Maps" })))
        } catch {
          sourceErrors.push("Não foi possível consultar Google Places.")
          break
        }
      }
      sources.push("Google Maps / Places")
    }

    // Complemento gratuito com OpenStreetMap, respeitando intervalo do serviço público.
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
        if (Array.isArray(data)) allItems.push(...data.map((item: any) => ({ ...item, _source: "OpenStreetMap" })))
      } catch {
        sourceErrors.push("Uma das consultas ao OpenStreetMap falhou.")
      }
    }
    sources.push("OpenStreetMap")

    const seen = new Set<string>()
    const results = allItems.map((item: any) => makeResult(item, city, category, item._source === "Google Maps" ? "Google Maps" : "OpenStreetMap"))
      .filter((item: any) => {
        if (!item.name || !item.address) return false
        const key = item.mergeKey
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(({ mergeKey: _mergeKey, dedupeKey: _dedupeKey, ...item }: any) => item)
      .filter((item: any) => !whatsappOnly || Boolean(item.whatsapp_url))

    return NextResponse.json({
      results,
      sources: apiKey ? sources : ["OpenStreetMap"],
      searchesPerformed: variants.length,
      whatsappOnly,
      notice: [
        !apiKey ? "Google Places ainda não está ativado: configure GOOGLE_MAPS_API_KEY ou GOOGLE_PLACES_API_KEY nas variáveis de ambiente da Vercel. Por enquanto, a busca usa OpenStreetMap." : "",
        sourceErrors[0] || "",
        "O filtro considera telefones públicos que podem ser abertos no WhatsApp; não confirma se o número tem uma conta ativa no WhatsApp. Os resultados podem não incluir todas as empresas da cidade."
      ].filter(Boolean).join(" "),
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os estabelecimentos agora. Tente novamente." }, { status: 502 })
  }
}
