"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Copy, ExternalLink, LogOut, MapPin, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2 } from "lucide-react"

type Company = { id: string; name: string; slug: string; review_url: string; created_at?: string; updated_at?: string }
type Establishment = { id: string; name: string; address: string; maps_url: string; category: string; phone?: string; whatsapp_url?: string }

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [companies, setCompanies] = useState<Company[]>([])
  const [name, setName] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [editUrls, setEditUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [establishmentCity, setEstablishmentCity] = useState("Macaúbas, Bahia")
  const [establishmentCategory, setEstablishmentCategory] = useState("restaurante")
  const [whatsappOnly, setWhatsappOnly] = useState(false)
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
      setName(""); setReviewUrl(""); setMessage("Empresa cadastrada e link exclusivo gerado.")
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

  async function deleteCompany(company: Company) {
    const confirmed = window.confirm(`Tem certeza que deseja apagar a empresa "${company.name}"? Essa ação não pode ser desfeita.`)
    if (!confirmed) return
    setError(""); setMessage(""); setLoading(true)
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Não foi possível apagar a empresa.")
      setMessage(`Empresa "${company.name}" apagada com sucesso.`)
      await loadCompanies()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao apagar empresa.")
    } finally {
      setLoading(false)
    }
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
              <input id="company-name" value={name} onChange={e => setName(e.target.value)} placeholder="Digite o nome do estabelecimento" minLength={2} required />
              <label htmlFor="review-url">Link de avaliação do Google</label>
              <input id="review-url" type="url" value={reviewUrl} onChange={e => setReviewUrl(e.target.value)} placeholder="https://g.page/r/.../review" required />
              <p className="admin-muted">Use o buscador abaixo para encontrar o estabelecimento em Macaúbas e copiar o link do Google Maps.</p>
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
                  <button className="admin-button danger" type="button" onClick={() => void deleteCompany(company)} disabled={loading}><Trash2 size={16} /> Apagar empresa</button>
                </article>)}
              </div>}
            </section>

                        <section className="admin-panel">
              <h2><MapPin size={20} /> Buscar empresas por cidade e categoria</h2>
              <p>Informe a cidade e o tipo de empresa. Os resultados mostram os contatos públicos encontrados e um atalho para conversar pelo WhatsApp quando houver número disponível.</p>
              <form onSubmit={async event => {
                event.preventDefault()
                const city = establishmentCity.trim()
                const category = establishmentCategory.trim()
                if (city.length < 2 || category.length < 2) {
                  setEstablishmentsMessage("Informe a cidade e a categoria da empresa.")
                  return
                }
                setEstablishmentsLoading(true)
                setEstablishments([])
                setEstablishmentsMessage("")
                try {
                  const params = new URLSearchParams({ city, category, whatsappOnly: String(whatsappOnly) })
                  const response = await fetch("/api/admin/companies/search-establishments?" + params.toString(), { cache: "no-store" })
                  const data = await response.json()
                  if (!response.ok) throw new Error(data.error || "Não foi possível procurar empresas.")
                  setEstablishments(Array.isArray(data.results) ? data.results : [])
                  if (!data.results?.length) setEstablishmentsMessage("Nenhuma empresa encontrada com esses dados. Tente outra categoria ou cidade.")
                  else setEstablishmentsMessage(`${data.results.length} empresas encontradas após ampliar a busca e remover duplicados. ${data.notice || ""}`.trim())
                } catch (e) {
                  setEstablishmentsMessage(e instanceof Error ? e.message : "Não foi possível procurar empresas.")
                } finally {
                  setEstablishmentsLoading(false)
                }
              }}>
                <label htmlFor="establishment-city">Cidade, estado ou país</label>
                <input id="establishment-city" value={establishmentCity} onChange={e => setEstablishmentCity(e.target.value)} placeholder="Ex.: Macaúbas, Bahia" minLength={2} required />
                <label htmlFor="establishment-category">Categoria de empresa</label>
                <input id="establishment-category" value={establishmentCategory} onChange={e => setEstablishmentCategory(e.target.value)} placeholder="Ex.: restaurante, barbearia, oficina..." minLength={2} required />
                <label className="admin-muted" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 12 }}>
                  <input type="checkbox" checked={whatsappOnly} onChange={e => setWhatsappOnly(e.target.checked)} />
                  Mostrar somente empresas com telefone público para contato pelo WhatsApp
                </label>
                <button className="admin-button primary" type="submit" disabled={establishmentsLoading}>
                  <Search size={16} /> {establishmentsLoading ? "Buscando empresas..." : "Gerar lista de empresas"}
                </button>
                <p className="admin-muted">Fontes: Google Maps / Places (quando a chave estiver configurada) e OpenStreetMap. O filtro usa telefones públicos e não confirma se o número tem WhatsApp ativo. Exemplos: restaurante, barbearia, salão de beleza, mercado, oficina mecânica.</p>
              </form>
              {establishmentsLoading && <p className="admin-muted" role="status">Procurando empresas...</p>}
              {establishmentsMessage && <p className="admin-muted" role="status">{establishmentsMessage}</p>}
              {establishments.length > 0 && <div className="company-list">
                {establishments.map(place => <article className="company-item" key={place.id}>
                  <h3>{place.name}</h3>
                  <p className="admin-muted">{place.address}</p>
                  <p className="admin-muted">Categoria: {place.category}</p>
                  {place.phone && <p className="admin-muted">Telefone público: {place.phone}</p>}
                  <div className="link-row">
                    {place.whatsapp_url ? <a className="admin-button primary" href={place.whatsapp_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir WhatsApp (telefone público)</a> : <span className="admin-muted">Telefone/WhatsApp não informado publicamente</span>}
                    <a className="admin-button secondary" href={place.maps_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Ver no Google Maps</a>
                  </div>
                </article>)}
              </div>}
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
