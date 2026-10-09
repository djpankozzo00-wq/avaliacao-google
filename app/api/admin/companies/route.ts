import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createCompany, listCompanies } from "@/lib/companies-db"

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  try {
    return NextResponse.json(await listCompanies())
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar empresas." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  try {
    const body = await request.json()
    return NextResponse.json(await createCompany(body), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao cadastrar empresa." }, { status: 400 })
  }
}
