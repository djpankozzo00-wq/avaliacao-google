"use client"

import { useEffect, useState } from "react"


type Company = { name: string; slug: string; review_url: string }

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-label="Google" role="img"><path fill="#4285F4" d="M47.5 24.55c0-1.64-.15-3.22-.42-4.74H24v8.97h13.18a11.27 11.27 0 0 1-4.9 7.4v6.18h7.94c4.65-4.28 7.28-10.58 7.28-17.81Z"/><path fill="#34A853" d="M24 48c6.64 0 12.2-2.2 16.27-5.64l-7.94-6.18c-2.2 1.47-5 2.34-8.33 2.34-6.4 0-11.82-4.32-13.76-10.13H2.03v6.38A24.58 24.58 0 0 0 24 48Z"/><path fill="#FBBC05" d="M10.24 28.39A14.76 14.76 0 0 1 9.47 24c0-1.52.27-3 .77-4.39v-6.38H2.03A24.02 24.02 0 0 0 0 24c0 3.88.93 7.55 2.03 10.77l8.21-6.38Z"/><path fill="#EA4335" d="M24 9.48c3.62 0 6.87 1.25 9.43 3.7l7.07-7.07C36.18 2.2 30.64 0 24 0A24.58 24.58 0 0 0 2.03 13.23l8.21 6.38C12.18 13.8 17.6 9.48 24 9.48Z"/></svg>
}


function HandPhone({ scan = false }: { scan?: boolean }) {
  if (scan) return <svg className="hand-phone" viewBox="0 0 100 150" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="18" y="4" width="64" height="142" rx="16" />
      <path d="M37 9h26q4 0 4 5v3q0 6-6 6H39q-6 0-6-6v-3q0-5 4-5Z" />
      <path d="M40 139h20" />
      <path d="M18 38H9Q3 38 3 47v20 M82 38h9q6 0 6 9v20 M18 107H9q-6 0-6-9v-8 M82 107h9q6 0 6-9v-8" />
      <path d="M29 42h18v18H29z M53 42h18v18H53z M29 68h18v18H29z" />
      <path d="M51 67h4v4h-4z M58 66h4v8h-4z M65 68h5v4h-5z M51 76h7v4h-7z M61 78h4v8h-4z M51 84h4v5h-4z M68 79h4v10h-4z M54 91h4v5h-4z M62 92h9v4h-9z" />
    </g>
    <path d="M8 75H92" stroke="#e74759" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
  return <svg className="hand-phone" viewBox="0 0 100 150" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 64A34 34 0 0 1 83 64" stroke="#4b4b4b" strokeWidth="7"/>
      <path d="M29 64a22 22 0 0 1 42 0" stroke="#4b4b4b" strokeWidth="7"/>
      <path d="M43 118 25 92q-5-8 2-12 7-4 12 4l5 8V58q0-8 7-8t7 8v22q7-8 13 0 7-3 10 5 8-1 8 8v24q0 10-9 16v10H44v-15Z" stroke="#080808" strokeWidth="7"/>
    </g>
  </svg>
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
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=14&data=${encodeURIComponent(company.review_url)}`
  const openReview = () => window.open(company.review_url, "_blank", "noopener,noreferrer")
  return <main className="review-page virtual-sign-page" onClick={openReview}>
    <section className="review-card" aria-label={`Placa de avaliação de ${company.name}`}>
      <GoogleMark />
      <div className="stars" aria-label="Cinco estrelas"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
      <h1>Avalie nossa<br/>empresa!</h1>
      <p className="subtitle">{company.name}</p>
      <div className="qr-shell"><img src={qrCode} alt={`QR Code para avaliar ${company.name} no Google`} /></div>
      <p className="qr-label">QR CODE</p>
      <div className="actions">
        <div className="action-item touch-item">
          <div className="scan-icon"><HandPhone /></div>
          <span>Toque</span>
        </div>
        <span className="or">ou</span>
        <div className="action-item scan-item">
          <div className="scan-icon"><HandPhone scan /></div>
          <span>Escaneie</span>
        </div>
      </div>
      <div className="footer-line"/><p className="powered">Powered by <strong>StarTouch</strong></p>
    </section>
  </main>
}
