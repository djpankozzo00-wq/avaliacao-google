"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Copy, ExternalLink, LogOut, Plus, RefreshCw, Save, ShieldCheck } from "lucide-react"

type Company = { id: string; name: string; slug: string; review_url: string; created_at?: string; updated_at?: string }

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
  const [placeUrl, setPlaceUrl] = useState("")
  const [placeName, setPlaceName] = useState("")
  const [placeLoading, setPlaceLoading] = useState(false)
  const [placeMessage, setPlaceMessage] = useState("")

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
              <h2>🔎 Descobrir nome do lugar</h2>
              <p>Cole um link do Google Maps, como https://maps.app.goo.gl/cju95adnbkhngmcA7, para tentar identificar o nome do estabelecimento.</p>
              <label htmlFor="place-lookup-url">Link do Google Maps</label>
              <input
                id="place-lookup-url"
                type="url"
                value={placeUrl}
                onChange={e => { setPlaceUrl(e.target.value); setPlaceName(""); setPlaceMessage("") }}
                placeholder="https://maps.app.goo.gl/..."
              />
              <button
                className="admin-button primary"
                type="button"
                disabled={placeLoading || !placeUrl.trim()}
                onClick={async () => {
                  setPlaceLoading(true)
                  setPlaceName("")
                  setPlaceMessage("")
                  try {
                    const response = await fetch("/api/admin/companies/resolve-name", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ review_url: placeUrl.trim() }),
                    })
                    const data = await response.json()
                    if (!response.ok) throw new Error(data.error || "Não foi possível consultar esse link.")
                    if (typeof data.name === "string" && data.name.trim()) {
                      setPlaceName(data.name.trim())
                      setPlaceMessage("Nome encontrado. Você pode copiá-lo abaixo.")
                    } else {
                      setPlaceMessage("O Google não disponibilizou o nome nesse link. Tente um link compartilhado diretamente do Google Maps ou digite o nome manualmente.")
                    }
                  } catch (e) {
                    setPlaceMessage(e instanceof Error ? e.message : "Não foi possível consultar esse link.")
                  } finally {
                    setPlaceLoading(false)
                  }
                }}
              >
                <RefreshCw size={16} /> {placeLoading ? "Buscando nome..." : "Buscar nome do lugar"}
              </button>
              {placeName && (
                <>
                  <label htmlFor="place-lookup-result">Nome do lugar</label>
                  <div className="link-row">
                    <input id="place-lookup-result" value={placeName} readOnly />
                    <button className="admin-button secondary icon-button" type="button" title="Copiar nome" onClick={() => void copy(placeName)}><Copy size={16} /></button>
                  </div>
                </>
              )}
              {placeMessage && <p className={placeName ? "admin-success" : "admin-muted"} role="status">{placeMessage}</p>}
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
