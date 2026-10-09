"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Copy, ExternalLink, LogOut, MapPin, Plus, RefreshCw, Save, Search, ShieldCheck } from "lucide-react"

type Company = { id: string; name: string; slug: string; review_url: string; created_at?: string; updated_at?: string }
type Establishment = { id: string; name: string; address: string; maps_url: string; osm_url?: string; category: string }

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [companies, setCompanies] = useState<Company[]>([])
  const [name, setName] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [autoName, setAutoName] = useState(false)
  const [resolvingName, setResolvingName] = useState(false)
  const [editUrls, setEditUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [establishmentQuery, setEstablishmentQuery] = useState("")
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [establishmentsLoading, setEstablishmentsLoading] = useState(false)
  const [establishmentsMessage, setEstablishmentsMessage] = useState("")

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/companies", { cache: "no-store" })
      if (response.status === 401) { setAuthenticated(false); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as empresas.")
      setCompanies(data)
      setEditUrls(Object.fromEntries(data.map((company: Company) => [company.id, company.review_url])))
      setAuthenticated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadCompanies() }, [loadCompanies])

  useEffect(() => {
    const value = reviewUrl.trim()
    if (!value) return
    let active = true
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/companies/resolve-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_url: value }),
        })
        if (!response.ok) return
        const data = await response.json()
        if (active && typeof data.name === "string" && data.name.trim()) {
          setName(data.name.trim())
          setAutoName(true)
        }
      } catch {
        // Alguns links do Google não disponibilizam o nome publicamente.
      } finally {
        if (active) setResolvingName(false)
      }
    }, 700)
    setResolvingName(true)
    return () => { active = false; clearTimeout(timer) }
  }, [reviewUrl])

  async function login(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true)
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível entrar.")
      setPassword(""); await loadCompanies()
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao entrar.") }
    finally { setLoading(false) }
  }

  async function create(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true)
    try {
      const response = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, review_url: reviewUrl }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar.")
      setName(""); setReviewUrl(""); setAutoName(false); setMessage("Empresa cadastrada e link exclusivo gerado.")
      await loadCompanies()
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao cadastrar.") }
    finally { setLoading(false) }
  }

  async function saveLink(company: Company) {
    setError(""); setMessage(""); setLoading(true)
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_url: editUrls[company.id] }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.")
      setMessage(`Link de avaliação de ${company.name} atualizado.`)
      await loadCompanies()
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao salvar.") }
    finally { setLoading(false) }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" })
    setAuthenticated(false); setCompanies([]); setMessage("Sessão encerrada.")
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setMessage("Link copiado.") }
    catch { setMessage("Não foi possível copiar automaticamente. Selecione e copie o link.") }
  }

  const publicUrl = (slug: string) => typeof window === "undefined" ? `/empresa/${slug}` : `${window.location.origin}/empresa/${slug}`

  return (
    <main className="admin-page">
      <div className="admin-wrap">
        <header className="admin-header">
          <div className="admin-brand"><ShieldCheck size={25} /><div><h1>Painel administrativo</h1><p>Gerencie os links de avaliação por empresa</p></div></div>
          {authenticated && <button className="admin-button secondary" onClick={logout}><LogOut size={16} /> Sair</button>}
        </header>

        {!authenticated ? (
          <form className="admin-panel login-panel" onSubmit={login}>
            <div className="admin-lock">🔐</div><h2>Acesso restrito</h2><p>Digite a senha administrativa para continuar.</p>
            <label htmlFor="admin-password">Senha</label>
            <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            <button className="admin-button primary full" disabled={loading}>{loading ? "Verificando..." : "Entrar no painel"}</button>
            {error && <p className="admin-error">{error}</p>}
          </form>
        ) : (
          <>
            <form className="admin-panel" onSubmit={create}>
              <h2><Plus size={20} /> Cadastrar empresa</h2>
              <p>Informe o nome e o link oficial de avaliação do Google. Um endereço exclusivo será gerado para essa empresa.</p>
              <label htmlFor="company-name">Nome da empresa</label>
              <input id="company-name" value={name} onChange={e => { setName(e.target.value); setAutoName(false) }} placeholder="Será preenchido pelo link do Google" minLength={2} required />
              <label htmlFor="review-url">Link de avaliação do Google</label>
              <input id="review-url" type="url" value={reviewUrl} onChange={e => setReviewUrl(e.target.value)} placeholder="https://g.page/r/.../review" required />\n              <p className="admin-muted">{resolvingName ? "Identificando o estabelecimento pelo link..." : "Ao colar o link, tentaremos preencher o nome automaticamente. Se o Google não fornecer o nome, você poderá digitá-lo."}</p>
              <button className="admin-button primary" disabled={loading}><Plus size={17} /> {loading ? "Salvando..." : "Cadastrar e gerar link exclusivo"}</button>
            </form>

            <section className="admin-panel">
              <div className="list-heading"><h2>Empresas cadastradas</h2><button className="admin-button secondary" onClick={() => void loadCompanies()} disabled={loading}><RefreshCw size={15} /> Atualizar</button></div>
              {companies.length === 0 ? <p className="admin-muted">Nenhuma empresa cadastrada ainda.</p> : <div className="company-list">
                {companies.map(company => <article className="company-item" key={company.id}>
                  <h3>{company.name}</h3>
                  <label>Link exclusivo desta empresa</label>
                  <div className="link-row"><input readOnly value={publicUrl(company.slug)} /><button className="admin-button secondary icon-button" type="button" title="Copiar link exclusivo" onClick={() => void copy(publicUrl(company.slug))}><Copy size={16} /></button><a className="admin-button secondary icon-button" href={`/empresa/${company.slug}`} target="_blank" rel="noreferrer" title="Abrir página"><ExternalLink size={16} /></a></div>
                  <label htmlFor={`review-${company.id}`}>Link de avaliação configurado</label>
                  <input id={`review-${company.id}`} type="url" value={editUrls[company.id] ?? company.review_url} onChange={e => setEditUrls(old => ({ ...old, [company.id]: e.target.value }))} />
                  <button className="admin-button primary" type="button" onClick={() => void saveLink(company)} disabled={loading}><Save size={16} /> Salvar link de avaliação</button>
                </article>)}
              </div>}
            </section>

                        <section className="admin-panel">
              <h2><MapPin size={20} /> Procurar estabelecimentos em Macaúbas, Bahia</h2>
              <p>Pesquise estabelecimentos usando uma consulta online atualizada. Os resultados dependem dos locais disponíveis no mapa. Você pode abrir cada resultado no Google Maps e copiar o link para usar no cadastro.</p>
              <form
                onSubmit={async event => {
                  event.preventDefault()
                  const term = establishmentQuery.trim()
                  if (term.length < 2) {
                    setEstablishmentsMessage("Digite o nome ou o tipo de estabelecimento que deseja procurar.")
                    return
                  }
                  setEstablishmentsLoading(true)
                  setEstablishments([])
                  setEstablishmentsMessage("")
                  try {
                    const response = await fetch("/api/admin/companies/search-establishments?q=" + encodeURIComponent(term), { cache: "no-store" })
                    const data = await response.json()
                    if (!response.ok) throw new Error(data.error || "Não foi possível procurar estabelecimentos.")
                    setEstablishments(Array.isArray(data.results) ? data.results : [])
                    if (!data.results?.length) setEstablishmentsMessage("Nenhum resultado encontrado. Tente outro nome ou tipo, como farmácia, mercado, salão ou restaurante.")
                  } catch (e) {
                    setEstablishmentsMessage(e instanceof Error ? e.message : "Não foi possível procurar estabelecimentos.")
                  } finally {
                    setEstablishmentsLoading(false)
                  }
                }}
              >
                <label htmlFor="establishment-search">Nome ou tipo de estabelecimento</label>
                <div className="link-row">
                  <input
                    id="establishment-search"
                    value={establishmentQuery}
                    onChange={e => setEstablishmentQuery(e.target.value)}
                    placeholder="Ex.: farmácia, mercado, restaurante..."
                    minLength={2}
                    required
                  />
                  <button className="admin-button primary icon-button" type="submit" title="Pesquisar" disabled={establishmentsLoading}>
                    <Search size={16} />
                  </button>
                </div>
                <p className="admin-muted">Pesquise por categoria ou nome. A busca consulta dados de mapa online e limita a pesquisa a Macaúbas, BA.</p>
              </form>
              {establishmentsLoading && <p className="admin-muted" role="status">Procurando estabelecimentos...</p>}
              {establishmentsMessage && <p className="admin-muted" role="status">{establishmentsMessage}</p>}
              {establishments.length > 0 && (
                <div className="company-list">
                  {establishments.map(place => (
                    <article className="company-item" key={place.id}>
                      <h3>{place.name}</h3>
                      <p className="admin-muted">{place.address}</p>
                      <p className="admin-muted">Categoria: {place.category}</p>
                      <div className="link-row">
                        <a className="admin-button secondary" href={place.maps_url} target="_blank" rel="noreferrer">
                          <ExternalLink size={16} /> Abrir no Google Maps
                        </a>
                        <button className="admin-button primary" type="button" onClick={() => void copy(place.maps_url)}>
                          <Copy size={16} /> Copiar link
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        {message && <p className="admin-success" role="status">{message}</p>}
        {error && authenticated && <p className="admin-error" role="alert">{error}</p>}
        <p className="admin-footnote">Painel não listado na navegação pública. Os dados são salvos no banco de dados.</p>
      </div>
    </main>
  )
}
