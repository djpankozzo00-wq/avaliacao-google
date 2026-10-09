import { NextRequest, NextResponse } from "next/server"
import { adminCookie, createAdminSession } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "O painel ainda não foi configurado no ambiente de hospedagem." }, { status: 503 })
  }
  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }
  if (String(body.password ?? "") !== expected) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(adminCookie, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(adminCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 })
  return response
}
