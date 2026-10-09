"use client"

import { useEffect, useState } from "react"
import { QrCode, Smartphone } from "lucide-react"

type Company = { name: string; slug: string; review_url: string }

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-label="Google" role="img"><path fill="#4285F4" d="M47.5 24.55c0-1.64-.15-3.22-.42-4.74H24v8.97h13.18a11.27 11.27 0 0 1-4.9 7.4v6.18h7.94c4.65-4.28 7.28-10.58 7.28-17.81Z"/><path fill="#34A853" d="M24 48c6.64 0 12.2-2.2 16.27-5.64l-7.94-6.18c-2.2 1.47-5 2.34-8.33 2.34-6.4 0-11.82-4.32-13.76-10.13H2.03v6.38A24.58 24.58 0 0 0 24 48Z"/><path fill="#FBBC05" d="M10.24 28.39A14.76 14.76 0 0 1 9.47 24c0-1.52.27-3 .77-4.39v-6.38H2.03A24.02 24.02 0 0 0 0 24c0 3.88.93 7.55 2.03 10.77l8.21-6.38Z"/><path fill="#EA4335" d="M24 9.48c3.62 0 6.87 1.25 9.43 3.7l7.07-7.07C36.18 2.2 30.64 0 24 0A24.58 24.58 0 0 0 2.03 13.23l8.21 6.38C12.18 13.8 17.6 9.48 24 9.48Z"/></svg>
}

export default function CompanyReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    let active = true
    params.then(({ slug }) => fetch(`/api/companies/${encodeURIComponent(slug)}`, { cache: "no-store" }))
      .then(async response => {
        if (!response.ok) throw new Error("Empresa não encontrada")
        return response.json()
      })
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
      <div className="actions" aria-label="Escaneie o QR Code"><div className="action-item"><div className="scan-icon"><Smartphone size={47} strokeWidth={1.6}/><QrCode size={19} strokeWidth={2.2}/></div><span>Escaneie</span></div></div>
      <div className="footer-line"/><p className="powered">Powered by <strong>{company.name}</strong></p>
    </section>
  </main>
}
