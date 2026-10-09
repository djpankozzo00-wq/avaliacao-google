import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "avaliacao_admin_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 12

function secret() {
  return process.env.ADMIN_SESSION_SECRET
}

function signature(timestamp: string) {
  const key = secret()
  if (!key) throw new Error("ADMIN_SESSION_SECRET não configurado")
  return createHmac("sha256", key).update(timestamp).digest("hex")
}

export function createAdminSession() {
  const timestamp = String(Date.now())
  return `${timestamp}.${signature(timestamp)}`
}

export function isValidAdminSession(value: string | undefined) {
  if (!value) return false
  const [timestamp, suppliedSignature] = value.split(".")
  if (!timestamp || !suppliedSignature || !/^\d+$/.test(timestamp)) return false
  if (Date.now() - Number(timestamp) > SESSION_DURATION_SECONDS * 1000) return false
  try {
    const expected = signature(timestamp)
    const a = Buffer.from(expected)
    const b = Buffer.from(suppliedSignature)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function requireAdmin() {
  const jar = await cookies()
  return isValidAdminSession(jar.get(COOKIE_NAME)?.value)
}

export const adminCookie = COOKIE_NAME
