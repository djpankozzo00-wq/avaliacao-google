"use client"

import { useEffect, useState } from "react"


type Company = { name: string; slug: string; review_url: string }

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-label="Google" role="img"><path fill="#4285F4" d="M47.5 24.55c0-1.64-.15-3.22-.42-4.74H24v8.97h13.18a11.27 11.27 0 0 1-4.9 7.4v6.18h7.94c4.65-4.28 7.28-10.58 7.28-17.81Z"/><path fill="#34A853" d="M24 48c6.64 0 12.2-2.2 16.27-5.64l-7.94-6.18c-2.2 1.47-5 2.34-8.33 2.34-6.4 0-11.82-4.32-13.76-10.13H2.03v6.38A24.58 24.58 0 0 0 24 48Z"/><path fill="#FBBC05" d="M10.24 28.39A14.76 14.76 0 0 1 9.47 24c0-1.52.27-3 .77-4.39v-6.38H2.03A24.02 24.02 0 0 0 0 24c0 3.88.93 7.55 2.03 10.77l8.21-6.38Z"/><path fill="#EA4335" d="M24 9.48c3.62 0 6.87 1.25 9.43 3.7l7.07-7.07C36.18 2.2 30.64 0 24 0A24.58 24.58 0 0 0 2.03 13.23l8.21 6.38C12.18 13.8 17.6 9.48 24 9.48Z"/></svg>
}


function HandPhone({ scan = false }: { scan?: boolean }) {
  return <svg className="hand-phone" viewBox="0 0 100 112" aria-hidden="true">
    <g fill="none" stroke="#2454c5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 24 C26 18 30 14 36 14 H61 C67 14 71 18 71 24 V84 C71 90 67 94 61 94 H36 C30 94 26 90 26 84 Z"/>
      <path d="M39 19 H57 Q60 19 60 22 V24 H36 V22 Q36 19 39 19Z"/>
      <path d="M44 88 H54"/>
      <path d="M26 34 L18 39 Q14 42 14 49 V75 Q14 81 9 87 L4 93 Q1 97 4 100 Q7 103 11 99 L20 90 Q25 85 25 78"/>
      <path d="M71 36 Q79 30 83 36 Q86 41 81 46 L73 53"/>
      <path d="M72 49 Q81 44 85 50 Q88 55 82 60 L72 66"/>
      <path d="M72 62 Q80 59 83 65 Q85 70 79 74 L71 78"/>
      <path d="M26 72 Q19 72 18 78 Q17 84 24 86 L37 88"/>
      <path d="M38 94 L34 101 Q32 105 36 107 Q40 109 43 104 L48 96"/>
    </g>
    {scan ? <g fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M35 43h9v9h-9z M55 43h9v9h-9z M35 63h9v9h-9z"/>
      <path d="M48 43h4v4h-4z M46 51h4v4h-4z M52 54h4v4h-4z M47 60h4v4h-4z M54 64h4v4h-4z M60 58h4v4h-4z M48 70h4v4h-4z M59 70h5v4h-5z"/>
    </g> : <g fill="none" stroke="#2454c5" strokeWidth="2.8" strokeLinecap="round">
      <path d="M34 52 Q48 37 62 52"/><path d="M39 58 Q48 48 57 58"/><path d="M45 64 Q48 61 51 64"/><path d="M47 66 L49 68"/>
    </g>}
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
  return <main className="review-page" onClick={() => window.open(company.review_url, "_blank", "noopener,noreferrer")}>
    <section className="review-card" aria-label={`Placa de avaliação de ${company.name}`}>
      <GoogleMark />
      <div className="stars" aria-label="Cinco estrelas"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
      <h1>Avalie nossa<br/>empresa!</h1>
      <p className="subtitle">{company.name}</p>
      <div className="qr-shell"><img src={qrCode} alt={`QR Code para avaliar ${company.name} no Google`} /></div>
      <p className="qr-label">QR CODE</p><div className="divider"/>
      
      <div className="footer-line"/><p className="powered">Powered by <strong>{company.name}</strong></p>
    </section>
  </main>
}
