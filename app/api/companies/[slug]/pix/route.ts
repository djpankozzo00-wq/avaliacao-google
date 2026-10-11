import { NextResponse } from "next/server"
import { getCompany } from "@/lib/companies-db"

function emv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value
}
function crc16(payload: string) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    crc &= 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}
function makePix(key: string, name: string, city: string) {
  const account = emv("00", "BR.GOV.BCB.PIX") + emv("01", key)
  const body = emv("00", "01") + emv("01", "12") + emv("26", account) +
    emv("52", "0000") + emv("53", "986") + emv("58", "BR") +
    emv("59", name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25)) +
    emv("60", city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15)) +
    emv("62", emv("05", "***"))
  return body + "6304" + crc16(body + "6304")
}
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const company = await getCompany(slug)
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 })
    const pix = company.sign_configs?.pix || {}
    if (!pix.enabled || !pix.pix_key) return NextResponse.json({ error: "Plaquinha Pix não está configurada." }, { status: 400 })
    const city = String(pix.city || "").trim()
    if (!city) return NextResponse.json({ error: "Informe a cidade do titular no cadastro Pix." }, { status: 422 })
    const name = String(pix.recipient || company.name || "").trim()
    const pixCopiaECola = makePix(String(pix.pix_key).trim(), name, city)
    return NextResponse.json({ sucesso: true, nomeExibicao: name, pixCopiaECola }, { headers: { "Cache-Control": "no-store, max-age=0" } })
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o código Pix." }, { status: 500 })
  }
}
