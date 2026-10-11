"use client"

import { useEffect, useState } from "react"


type Company = { name: string; slug: string; review_url: string; sign_configs?: any }

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-label="Google" role="img"><path fill="#4285F4" d="M47.5 24.55c0-1.64-.15-3.22-.42-4.74H24v8.97h13.18a11.27 11.27 0 0 1-4.9 7.4v6.18h7.94c4.65-4.28 7.28-10.58 7.28-17.81Z"/><path fill="#34A853" d="M24 48c6.64 0 12.2-2.2 16.27-5.64l-7.94-6.18c-2.2 1.47-5 2.34-8.33 2.34-6.4 0-11.82-4.32-13.76-10.13H2.03v6.38A24.58 24.58 0 0 0 24 48Z"/><path fill="#FBBC05" d="M10.24 28.39A14.76 14.76 0 0 1 9.47 24c0-1.52.27-3 .77-4.39v-6.38H2.03A24.02 24.02 0 0 0 0 24c0 3.88.93 7.55 2.03 10.77l8.21-6.38Z"/><path fill="#EA4335" d="M24 9.48c3.62 0 6.87 1.25 9.43 3.7l7.07-7.07C36.18 2.2 30.64 0 24 0A24.58 24.58 0 0 0 2.03 13.23l8.21 6.38C12.18 13.8 17.6 9.48 24 9.48Z"/></svg>
}


export default function CompanyReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    let active = true
    params.then(({ slug }) => fetch(`/api/companies/${encodeURIComponent(slug)}`, { cache: "no-store" }))
      .then(async response => { if (!response.ok) throw new Error("Empresa não encontrada"); return response.json() })
      .then(data => { if (active) setCompany(data) })
      .catch(() => { if (active) setNotFound(true) })
    return () => { active = false }
  }, [params])
  if (!company && !notFound) return <main className="review-page"><section className="review-card"><p className="subtitle">Carregando avaliação...</p></section></main>
  if (!company) return <main className="review-page"><section className="review-card"><h1>Link não encontrado</h1><p className="subtitle">Confira o endereço com a empresa.</p></section></main>
  const searchParams = new URLSearchParams(window.location.search)
  const kind = searchParams.get("tipo") || "google"
  const signs = company.sign_configs || {}
  const cfg = signs[kind]
  const phone = String(signs.whatsapp?.phone || "").replace(/[^0-9]/g, "")
  const payload = kind === "google" ? company.review_url : kind === "pix" ? (signs.pix?.pix_key || "") : kind === "instagram" ? (signs.instagram?.url || ("https://instagram.com/" + String(signs.instagram?.username || "").replace(/^@/, ""))) : kind === "wifi" ? ("WIFI:T:WPA;S:" + (signs.wifi?.network || "") + ";P:" + (signs.wifi?.password || "") + ";;") : ("https://wa.me/" + phone + (signs.whatsapp?.message ? "?text=" + encodeURIComponent(signs.whatsapp.message) : ""))
  const qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=14&data=" + encodeURIComponent(payload)
  const titles: Record<string, string> = { google: "Avalie nossa", pix: "Pague com Pix!", instagram: "Siga nosso Instagram!", wifi: "Conecte-se ao Wi-Fi!", whatsapp: "Envie um WhatsApp!" }
  const subtitles: Record<string, string> = { google: company.name, pix: "Chave Pix: " + (signs.pix?.pix_key || ""), instagram: "Nosso perfil é " + (signs.instagram?.username || ""), wifi: "Rede: " + (signs.wifi?.network || "") + " · Senha: " + (signs.wifi?.password || ""), whatsapp: "Nosso número: " + (signs.whatsapp?.phone || "") }
  const openReview = () => { if (kind === "google" || kind === "instagram" || kind === "whatsapp") window.open(kind === "google" ? company.review_url : payload, "_blank", "noopener,noreferrer"); if (kind === "pix" && payload) void navigator.clipboard?.writeText(payload) }
  if (!["google", "pix", "instagram", "wifi", "whatsapp"].includes(kind) || (kind !== "google" && (!cfg?.enabled || !payload))) return <main className="review-page"><section className="review-card"><h1>Placa indisponível</h1><p className="subtitle">Ative e configure esta plaquinha no painel administrativo.</p></section></main>
  return <main className="review-page virtual-sign-page" onClick={openReview}>
    <section className="review-card" aria-label={"Placa " + kind + " de " + company.name}>
      {kind === "google" ? <GoogleMark /> : <div className={"google-mark sign-symbol sign-" + kind} aria-label={"Ícone " + kind} role="img">
        {kind === "pix" ? <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16.8 5.5 24 12.7l7.2-7.2a9.1 9.1 0 0 1 12.9 12.9L36.9 26l-7.2-7.2a8.1 8.1 0 0 0-11.4 0L11.1 26l-7.2-7.6A9.1 9.1 0 0 1 16.8 5.5ZM5.5 21.2l7.2 7.2-7.2 7.2a9.1 9.1 0 0 1 12.9-12.9l5.6 5.6 5.6-5.6a9.1 9.1 0 0 1 12.9 12.9l-7.2-7.2-7.2 7.2a8.1 8.1 0 0 1-11.4 0l-7.2-7.2-7.2 7.2a9.1 9.1 0 0 1 0-12.9Z" fill="currentColor" transform="translate(0 2) scale(.96)"/></svg>
        : kind === "instagram" ? <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="5" y="5" width="38" height="38" rx="11" stroke="currentColor" strokeWidth="3.5"/><circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="3.5"/><circle cx="35.5" cy="12.8" r="2.5" fill="currentColor"/></svg>
        : kind === "wifi" ? <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><path d="M5 17.5a29 29 0 0 1 38 0"/><path d="M11.5 25a19 19 0 0 1 25 0"/><path d="M18.5 32a8.5 8.5 0 0 1 11 0"/><circle cx="24" cy="39" r="2.5" fill="currentColor" stroke="none"/></svg>
        : <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4.5A19.2 19.2 0 0 0 7.5 33.5L5 43l10-2.5A19.3 19.3 0 1 0 24 4.5Z" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round"/><path d="M17.2 14.8c-.7-.9-1.5-.8-2.1-.8-.6 0-1.5.2-2.3 1.1-.8.9-3 2.9-3 7.1s3.1 8.2 3.5 8.8c.4.6 6 9.5 14.7 12.9 7.3 2.9 8.8 2.3 10.4 2.1 1.6-.2 5.2-2.1 5.9-4.1.7-2 .7-3.7.5-4.1-.2-.4-.8-.6-1.7-1.1s-5.2-2.6-6-2.9c-.8-.3-1.4-.5-2 .5-.6.9-2.3 2.9-2.8 3.5-.5.6-1 .7-1.9.2-.9-.5-3.8-1.4-7.2-4.4-2.7-2.4-4.5-5.3-5-6.2-.5-.9 0-1.4.4-1.8.4-.4.9-1 1.3-1.5.4-.5.6-.9.9-1.5.3-.6.1-1.1-.1-1.5-.2-.4-1.8-4.4-2.5-6.1Z" fill="currentColor" transform="translate(5 1) scale(.78)"/></svg>}
      </div>}
      <div className="stars" aria-label="Cinco estrelas"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
      <h1>{titles[kind] || titles.google}{kind === "google" ? <><br/>empresa!</> : null}</h1>
      <p className="subtitle">{subtitles[kind] || company.name}</p>
      <div className="qr-shell"><img src={qrCode} alt={`QR Code para avaliar ${company.name} no Google`} /></div>
      <p className="qr-label">{kind === "pix" ? "QR CODE · TOQUE PARA COPIAR" : "QR CODE"}</p>
      <div className="actions">
        <div className="action-item touch-item">
          <div className="scan-icon image-icon"><img src="/touch-icon.png" alt="Ícone de toque" /></div>
          <span>Toque</span>
        </div>
        <span className="or">ou</span>
        <div className="action-item scan-item">
          <div className="scan-icon image-icon"><img src="/scan-icon.png" alt="Ícone de escaneamento de QR Code" /></div>
          <span>Escaneie</span>
        </div>
      </div>
      <div className="footer-line"/><p className="powered">Powered by <strong>StarTouch</strong></p>
    </section>
  </main>
}
