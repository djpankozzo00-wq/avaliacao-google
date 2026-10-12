"use client"

import { useEffect, useState } from "react"


type Company = { name: string; slug: string; review_url: string; sign_configs?: any }

function escapeWifi(value: string) { return value.replace(/([\\;,:"])/g, "\\$1") }

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-label="Google" role="img"><path fill="#4285F4" d="M47.5 24.55c0-1.64-.15-3.22-.42-4.74H24v8.97h13.18a11.27 11.27 0 0 1-4.9 7.4v6.18h7.94c4.65-4.28 7.28-10.58 7.28-17.81Z"/><path fill="#34A853" d="M24 48c6.64 0 12.2-2.2 16.27-5.64l-7.94-6.18c-2.2 1.47-5 2.34-8.33 2.34-6.4 0-11.82-4.32-13.76-10.13H2.03v6.38A24.58 24.58 0 0 0 24 48Z"/><path fill="#FBBC05" d="M10.24 28.39A14.76 14.76 0 0 1 9.47 24c0-1.52.27-3 .77-4.39v-6.38H2.03A24.02 24.02 0 0 0 0 24c0 3.88.93 7.55 2.03 10.77l8.21-6.38Z"/><path fill="#EA4335" d="M24 9.48c3.62 0 6.87 1.25 9.43 3.7l7.07-7.07C36.18 2.2 30.64 0 24 0A24.58 24.58 0 0 0 2.03 13.23l8.21 6.38C12.18 13.8 17.6 9.48 24 9.48Z"/></svg>
}


export default function CompanyReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeKind, setActiveKind] = useState("google")
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [pixCopyPaste, setPixCopyPaste] = useState("")
  const [pixError, setPixError] = useState("")
  const [wifiFocus, setWifiFocus] = useState(false)
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tipo")
    if (requested && ["google", "pix", "instagram", "wifi", "whatsapp"].includes(requested)) setActiveKind(requested)
  }, [])
  useEffect(() => {
    if (activeKind !== "wifi") {
      setWifiFocus(false)
      return
    }
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const requestWakeLock = async () => {
      if (cancelled || document.visibilityState !== "visible" || lock) return
      try {
        lock = await navigator.wakeLock.request("screen")
        if (cancelled && lock) {
          await lock.release()
          lock = null
        }
      } catch {
        // O navegador pode não oferecer suporte ou bloquear o recurso.
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        lock = null
        void requestWakeLock()
      }
    }
    void requestWakeLock()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", handleVisibility)
      if (lock) void lock.release()
    }
  }, [activeKind])
  useEffect(() => {
    if (!company?.slug) return
    let active = true
    fetch(`/api/companies/${encodeURIComponent(company.slug)}/pix`, { cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix."); return data })
      .then(data => { if (active) { setPixCopyPaste(data.pixCopiaECola || ""); setPixError("") } })
      .catch(error => { if (active) { setPixCopyPaste(""); setPixError(error.message || "Não foi possível gerar o Pix.") } })
    return () => { active = false }
  }, [company?.slug, company?.sign_configs])
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
  const signs = company.sign_configs || {}
  const availableKinds = ["google", "pix", "instagram", "wifi", "whatsapp"].filter(item => item === "google" || (signs[item]?.enabled && (item === "pix" ? signs.pix?.pix_key : item === "instagram" ? (signs.instagram?.url || signs.instagram?.username) : item === "wifi" ? signs.wifi?.network : signs.whatsapp?.phone)))
  const kind = availableKinds.includes(activeKind) ? activeKind : "google"
  const changeSlide = (direction: number) => {
    const index = availableKinds.indexOf(kind)
    setActiveKind(availableKinds[(index + direction + availableKinds.length) % availableKinds.length])
  }
  const cfg = signs[kind]
  const phone = String(signs.whatsapp?.phone || "").replace(/[^0-9]/g, "")
  const wifiSecurity = String(signs.wifi?.security || "WPA")
  const wifiPayload = "WIFI:T:" + wifiSecurity + ";S:" + escapeWifi(String(signs.wifi?.network || "")) + ";" + (wifiSecurity === "nopass" ? "" : "P:" + escapeWifi(String(signs.wifi?.password || "")) + ";") + ";"
  const payload = kind === "google" ? company.review_url : kind === "pix" ? pixCopyPaste : kind === "instagram" ? (signs.instagram?.url || ("https://instagram.com/" + String(signs.instagram?.username || "").replace(/^@/, ""))) : kind === "wifi" ? wifiPayload : ("https://wa.me/" + phone + (signs.whatsapp?.message ? "?text=" + encodeURIComponent(signs.whatsapp.message) : ""))
  const qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=14&data=" + encodeURIComponent(payload)
  const titles: Record<string, string> = { google: "Avalie nossa", pix: "Pague com Pix!", instagram: "Siga nosso Instagram!", wifi: "Conecte-se ao Wi-Fi!", whatsapp: "Envie um WhatsApp!" }
  const subtitles: Record<string, string> = { google: company.name, pix: pixError || ("Titular: " + (signs.pix?.recipient || company.name)), instagram: "Nosso perfil é " + (signs.instagram?.username || ""), wifi: "Rede: " + (signs.wifi?.network || "") + " · Senha: " + (signs.wifi?.password || ""), whatsapp: "Nosso número: " + (signs.whatsapp?.phone || "") }
  const openReview = () => { if (kind === "wifi") { setWifiFocus(value => !value); return } if (kind === "google" || kind === "instagram" || kind === "whatsapp") window.open(kind === "google" ? company.review_url : payload, "_blank", "noopener,noreferrer"); if (kind === "pix" && payload) void navigator.clipboard?.writeText(payload) }
  if (!["google", "pix", "instagram", "wifi", "whatsapp"].includes(kind) || (kind !== "google" && (!cfg?.enabled || !payload))) return <main className="review-page"><section className="review-card"><h1>Placa indisponível</h1><p className="subtitle">Ative e configure esta plaquinha no painel administrativo.</p></section></main>
  return <main className="review-page virtual-sign-page sign-carousel" onTouchStart={e => setTouchStartX(e.touches[0].clientX)} onTouchEnd={e => { if (touchStartX !== null) { const delta = e.changedTouches[0].clientX - touchStartX; if (Math.abs(delta) > 45) changeSlide(delta < 0 ? 1 : -1) } setTouchStartX(null) }}>
    <section className={"review-card" + (kind === "wifi" && wifiFocus ? " wifi-focus" : "")} aria-label={"Placa " + kind + " de " + company.name} onClick={openReview}>
      <div className={"google-mark sign-symbol sign-" + kind} aria-label={"Ícone " + kind} role="img"><img className="sign-icon-image" src={`/sign-icons/${kind}.png`} alt="" /></div>
      <div className="stars" aria-label="Cinco estrelas"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
      <h1>{titles[kind] || titles.google}{kind === "google" ? <><br/>empresa!</> : null}</h1>
      <p className="subtitle">{subtitles[kind] || company.name}</p>
      <div className="qr-shell" style={kind === "wifi" && wifiFocus ? { transform: "scale(1.2)", margin: "28px auto", position: "relative", zIndex: 2, transition: "transform 180ms ease" } : { transition: "transform 180ms ease" }}><img src={qrCode} alt={kind === "wifi" ? "QR Code para conectar ao Wi-Fi" : `QR Code para avaliar ${company.name} no Google`} style={kind === "wifi" && wifiFocus ? { width: "min(78vw, 360px)", height: "auto" } : undefined} /></div>
      <p className="qr-label">{kind === "pix" ? (pixError ? "CONFIGURE O PIX NO PAINEL" : "PIX COPIA E COLA · TOQUE PARA COPIAR") : kind === "wifi" ? (wifiFocus ? "MODO DE CONEXÃO · TOQUE PARA VOLTAR" : "TOQUE NA PLACA PARA AMPLIAR O QR CODE") : "QR CODE"}</p>
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
      <div className="footer-line"/><p className="powered"><a href="https://www.instagram.com/_xdhesy_?psln=YzdmNG9rYW9jdmg=" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Powered by <strong>XDhe$y</strong></a></p>
      {availableKinds.length > 1 ? <div className="sign-carousel-controls"><button type="button" aria-label="Plaquinha anterior" onClick={e => { e.stopPropagation(); changeSlide(-1) }}>‹</button><div className="sign-carousel-dots">{availableKinds.map(item => <button type="button" key={item} aria-label={"Ver placa " + item} className={item === kind ? "active" : ""} onClick={e => { e.stopPropagation(); setActiveKind(item) }} />)}</div><button type="button" aria-label="Próxima plaquinha" onClick={e => { e.stopPropagation(); changeSlide(1) }}>›</button></div> : null}
    </section>
  </main>
}
