import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function normalize(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

function categoryTags(category: string) {
  const value = normalize(category)
  const categories: Record<string, string[]> = {
    restaurante: ['["amenity"~"restaurant|fast_food|food_court"]', '["cuisine"]'],
    restaurantes: ['["amenity"~"restaurant|fast_food|food_court"]', '["cuisine"]'],
    lanchonete: ['["amenity"~"fast_food|restaurant|cafe"]'],
    pizzaria: ['["cuisine"~"pizza"]', '["amenity"~"restaurant|fast_food"]'],
    bar: ['["amenity"~"bar|pub"]'],
    barbearia: ['["shop"="hairdresser"]', '["craft"="barber"]'],
    barbearias: ['["shop"="hairdresser"]', '["craft"="barber"]'],
    "salao de beleza": ['["shop"="beauty"]', '["shop"="hairdresser"]'],
    farmacia: ['["amenity"="pharmacy"]'],
    farmacias: ['["amenity"="pharmacy"]'],
    mercado: ['["shop"~"supermarket|convenience|greengrocer"]'],
    supermercado: ['["shop"~"supermarket|convenience"]'],
    padaria: ['["shop"="bakery"]'],
    hotel: ['["tourism"~"hotel|guest_house|hostel"]'],
    academia: ['["leisure"="fitness_centre"]', '["sport"="fitness"]'],
    "oficina mecanica": ['["shop"="car_repair"]', '["craft"="car_repair"]'],
    dentista: ['["amenity"="dentist"]'],
    clinica: ['["amenity"~"clinic|doctors"]'],
    loja: ['["shop"]'],
    lojas: ['["shop"]'],
  }
  return categories[value] || ['["name"~"' + category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"/g, "") + '",i]']
}

function makeResult(item: any, city: string, category: string) {
  const tags = item.tags || {}
  const phone = String(tags["contact:phone"] || tags.phone || tags.mobile || tags["contact:mobile"] || tags["contact:whatsapp"] || tags.whatsapp || "").trim()
  const digits = phone.replace(/[^0-9]/g, "")
  const whatsappUrl = digits.length >= 10 ? "https://wa.me/" + (digits.startsWith("55") ? digits : "55" + digits) : ""
  const name = String(tags.name || tags["name:pt"] || tags.brand || "").trim()
  const addressParts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:suburb"] || tags["addr:neighbourhood"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || city,
    tags["addr:state"],
  ].filter(Boolean)
  const address = addressParts.join(", ") || city
  const id = String(item.type || "osm") + ":" + String(item.id)
  const categoryLabel = tags.amenity || tags.shop || tags.craft || tags.tourism || tags.leisure || tags.healthcare || category
  const lat = item.lat ?? item.center?.lat
  const lon = item.lon ?? item.center?.lon
  return {
    id,
    name: name || "Estabelecimento sem nome",
    address,
    maps_url: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([name, address, city].filter(Boolean).join(", ")),
    category: String(categoryLabel).replace(/_/g, " "),
    phone,
    whatsapp_url: whatsappUrl,
    source: "OpenStreetMap / Overpass",
    coordinates: lat != null && lon != null ? { lat, lon } : undefined,
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
    // Primeiro encontra a área da cidade no Nominatim; depois busca estabelecimentos no Overpass.
    const geoParams = new URLSearchParams({
      q: city + ", Brasil",
      format: "jsonv2",
      limit: "1",
      countrycodes: "br",
      addressdetails: "1",
      "accept-language": "pt-BR",
    })
    const geoResponse = await fetch("https://nominatim.openstreetmap.org/search?" + geoParams.toString(), {
      headers: { "User-Agent": "AvaliacaoGoogleAdmin/1.0 (business contact search)" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!geoResponse.ok) throw new Error("Não foi possível localizar a cidade no OpenStreetMap.")
    const geoData = await geoResponse.json()
    if (!Array.isArray(geoData) || !geoData.length || !geoData[0].boundingbox) {
      return NextResponse.json({ results: [], sources: ["OpenStreetMap / Overpass"], searchesPerformed: 0, whatsappOnly, notice: "Não localizei essa cidade. Tente informar cidade e estado, por exemplo: Macaúbas, Bahia." })
    }

    const box = geoData[0].boundingbox
    const south = Number(box[0]), north = Number(box[1]), west = Number(box[2]), east = Number(box[3])
    const bbox = [south, west, north, east].join(",")
    const selectors = categoryTags(category)
    const clauses = selectors.flatMap(selector => ["node" + selector + "(" + bbox + ");", "way" + selector + "(" + bbox + ");", "relation" + selector + "(" + bbox + ");"])
    const query = '[out:json][timeout:25];(' + clauses.join("") + ');out center tags;'

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ]
    let elements: any[] = []
    let lastError = ""
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "AvaliacaoGoogleAdmin/1.0" },
          body: new URLSearchParams({ data: query }).toString(),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        })
        if (!response.ok) {
          lastError = "O servidor de busca do OpenStreetMap está ocupado. Tente novamente em alguns instantes."
          continue
        }
        const data = await response.json()
        elements = Array.isArray(data.elements) ? data.elements : []
        break
      } catch {
        lastError = "Os servidores gratuitos de busca estão ocupados ou demoraram para responder."
      }
    }
    if (!elements.length && lastError) {
      return NextResponse.json({ results: [], sources: ["OpenStreetMap / Overpass"], searchesPerformed: selectors.length, whatsappOnly, notice: lastError })
    }

    const seen = new Set<string>()
    const results = elements.map(item => makeResult(item, city, category))
      .filter((item: any) => item.name !== "Estabelecimento sem nome")
      .filter((item: any) => {
        const key = normalize(item.name) + "|" + normalize(item.address)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .filter((item: any) => !whatsappOnly || Boolean(item.whatsapp_url))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR"))

    return NextResponse.json({
      results,
      sources: ["OpenStreetMap / Overpass"],
      searchesPerformed: selectors.length,
      whatsappOnly,
      notice: "Busca gratuita usando dados do OpenStreetMap. A cobertura depende dos estabelecimentos cadastrados no mapa. O filtro considera números públicos que podem ser abertos no WhatsApp; não confirma se a conta está ativa.",
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os estabelecimentos agora. Tente novamente." }, { status: 502 })
  }
}
