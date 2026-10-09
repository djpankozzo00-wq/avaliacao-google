import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { updateCompany } from "@/lib/companies-db"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  try {
    const { id } = await context.params
    const body = await request.json()
    return NextResponse.json(await updateCompany(id, body))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar o link." }, { status: 400 })
  }
}
