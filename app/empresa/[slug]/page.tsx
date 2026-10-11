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
        {kind === "pix" ? <svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><path d="M16.1 4.5c1.3 0 2.5.5 3.4 1.4l4.5 4.5 4.5-4.5a4.8 4.8 0 0 1 6.8 0l7 7-7 7a4.8 4.8 0 0 1-6.8 0L24 15.4l-4.5 4.5a4.8 4.8 0 0 1-6.8 0l-7-7 7-7a4.8 4.8 0 0 1 3.4-1.4Z" transform="translate(0 1) scale(1 .9)"/><path d="m5.7 19.2 7-7a4.8 4.8 0 0 1 6.8 0l4.5 4.5 4.5-4.5a4.8 4.8 0 0 1 6.8 0l7 7-7 7a4.8 4.8 0 0 1-6.8 0L24 21.7l-4.5 4.5a4.8 4.8 0 0 1-6.8 0l-7-7Z" transform="translate(0 5)"/></g></svg>
        : kind === "instagram" ? <svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="ig-gradient" x1="5" y1="43" x2="43" y2="5" gradientUnits="userSpaceOnUse"><stop stopColor="#FFDC80"/><stop offset=".32" stopColor="#F77737"/><stop offset=".62" stopColor="#E1306C"/><stop offset="1" stopColor="#833AB4"/></linearGradient></defs><rect x="4" y="4" width="40" height="40" rx="12" fill="none" stroke="url(#ig-gradient)" strokeWidth="4"/><circle cx="24" cy="24" r="9.5" fill="none" stroke="url(#ig-gradient)" strokeWidth="4"/><circle cx="35.2" cy="12.9" r="2.6" fill="#E1306C"/></svg>
        : kind === "wifi" ? <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M4.5 16.5a30 30 0 0 1 39 0" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round"/><path d="M11.5 24a19.5 19.5 0 0 1 25 0" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round"/><path d="M18.5 31.5a9 9 0 0 1 11 0" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round"/><circle cx="24" cy="39" r="3.2" fill="currentColor"/></svg>
        : <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#25D366"/><path d="m10.2 38 2.1-7.7a16.4 16.4 0 1 1 6.1 6.1L10.2 38Z" fill="#25D366" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M19 15.4c-.6-1.3-1.2-1.3-1.8-1.3h-1.5c-.5 0-1.4.2-2.1 1.1-.7.8-2.7 2.6-2.7 6.3s2.8 7.3 3.2 7.8c.4.5 5.4 8.6 13.2 11.7 6.5 2.6 7.9 2.1 9.3 1.9 1.4-.2 4.7-1.9 5.4-3.7.7-1.8.7-3.3.5-3.7-.2-.4-.7-.6-1.5-1s-4.7-2.3-5.5-2.6c-.7-.3-1.3-.4-1.8.4-.5.8-2.1 2.6-2.6 3.1-.5.5-.9.6-1.7.2-.8-.4-3.4-1.3-6.5-4-2.4-2.1-4-4.7-4.5-5.5-.5-.8 0-1.2.4-1.6.4-.4.8-.9 1.2-1.3.4-.5.5-.8.8-1.3.3-.5.1-1-.1-1.4-.2-.4-1.6-4-2.2-5.4Z" fill="#fff" transform="translate(2 0) scale(.82)"/></svg>}
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
