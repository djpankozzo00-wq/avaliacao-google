import { NextResponse } from "next/server"
import { getCompany } from "@/lib/companies-db"

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const company = await getCompany(slug)
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 })
    return NextResponse.json(company, { headers: { "Cache-Control": "no-store, max-age=0" } })
  } catch {
    return NextResponse.json({ error: "O serviço de empresas ainda não foi configurado." }, { status: 503 })
  }
}
