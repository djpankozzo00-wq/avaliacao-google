"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Copy, ExternalLink, LogOut, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react"

type SignConfigs = { pix: { enabled: boolean; pix_key: string; recipient: string; city: string }; instagram: { enabled: boolean; username: string; url: string }; wifi: { enabled: boolean; network: string; password: string; security: string }; whatsapp: { enabled: boolean; phone: string; message: string } }
type Company = { id: string; name: string; slug: string; review_url: string; sign_configs?: SignConfigs; created_at?: string; updated_at?: string }
const emptySigns: SignConfigs = { pix: { enabled: false, pix_key: "", recipient: "", city: "" }, instagram: { enabled: false, username: "", url: "" }, wifi: { enabled: false, network: "", password: "", security: "WPA" }, whatsapp: { enabled: false, phone: "", message: "" } }
export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [companies, setCompanies] = useState<Company[]>([])
  const [name, setName] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [editUrls, setEditUrls] = useState<Record<string, string>>({})
  const [editSigns, setEditSigns] = useState<Record<string, SignConfigs>>({})
  const [selectedSigns, setSelectedSigns] = useState<Record<string, keyof SignConfigs>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/companies", { cache: "no-store" })
      if (response.status === 401) { setAuthenticated(false); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as empresas.")
      setCompanies(data)
      setEditUrls(Object.fromEntries(data.map((company: Company) => [company.id, company.review_url])))
      setEditSigns(Object.fromEntries(data.map((company: Company) => [company.id, { ...emptySigns, ...(company.sign_configs || {}) }])))
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
      const response = await fetch(`/api/admin/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_url: editUrls[company.id], sign_configs: editSigns[company.id] }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.")
      setMessage(`Configurações das plaquinhas de ${company.name} salvas.`)
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

  const publicUrl = (slug: string, type = "google") => typeof window === "undefined" ? `/empresa/${slug}?tipo=${type}` : `${window.location.origin}/empresa/${slug}?tipo=${type}`

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
              <p>Cadastre o cliente e configure somente a plaquinha que ele deseja usar. O link do Google é opcional.</p>
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
                  <div className="sign-config-editor">
                    <h4>Configurar outras plaquinhas</h4>
                    {(["pix", "instagram", "wifi", "whatsapp"] as const).map(kind => {
                      const cfg = editSigns[company.id]?.[kind] || emptySigns[kind]
                      const patch = (field: string, value: string | boolean) => setEditSigns(old => ({ ...old, [company.id]: { ...(old[company.id] || emptySigns), [kind]: { ...((old[company.id] || emptySigns)[kind]), [field]: value } } as SignConfigs }))
                      const titles = { pix: "Pagamento Pix", instagram: "Instagram", wifi: "Wi-Fi", whatsapp: "WhatsApp" }
                      return <div className="sign-config-item" key={kind}>
                        <label className="sign-enable"><input type="checkbox" checked={cfg.enabled} onChange={e => patch("enabled", e.target.checked)} /> Ativar placa de {titles[kind]}</label>
                        {kind === "pix" && <><label>Chave Pix</label><input value={cfg.pix_key} onChange={e => patch("pix_key", e.target.value)} placeholder="Chave Pix" /><label>Nome do recebedor</label><input value={cfg.recipient} onChange={e => patch("recipient", e.target.value)} placeholder="Nome exibido na placa" /><label>Cidade do titular do Pix</label><input value={cfg.city || ""} onChange={e => patch("city", e.target.value.toUpperCase())} placeholder="Ex.: MACAÚBAS" maxLength={15} /></>}
                        {kind === "instagram" && <><label>Usuário do Instagram</label><input value={cfg.username} onChange={e => patch("username", e.target.value)} placeholder="@seuperfil" /><label>Link do perfil</label><input value={cfg.url} onChange={e => patch("url", e.target.value)} placeholder="https://instagram.com/seuperfil" /></>}
                        {kind === "wifi" && <><label>Nome da rede Wi-Fi</label><input value={cfg.network} onChange={e => patch("network", e.target.value)} placeholder="Nome da rede" /><label>Senha do Wi-Fi</label><input value={cfg.password} onChange={e => patch("password", e.target.value)} placeholder="Senha da rede" /><label>Tipo de segurança</label><select value={cfg.security || "WPA"} onChange={e => patch("security", e.target.value)}><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">Sem senha</option></select>{cfg.network.trim() && <div className="wifi-qr-preview"><p className="admin-muted">Prévia do QR Code Wi-Fi</p><img width="220" height="220" alt={"QR Code da rede Wi-Fi " + cfg.network} src={"https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=" + encodeURIComponent("WIFI:T:" + (cfg.security || "WPA") + ";S:" + cfg.network.replace(/([\\;,:"])/g, "\\$1") + ";" + ((cfg.security || "WPA") === "nopass" ? "" : "P:" + cfg.password.replace(/([\\;,:"])/g, "\\$1") + ";") + ";")} /></div>}</>}
                        {kind === "whatsapp" && <><label>Número do WhatsApp (com código do país)</label><input value={cfg.phone} onChange={e => patch("phone", e.target.value)} placeholder="5511999999999" /><label>Mensagem inicial (opcional)</label><input value={cfg.message} onChange={e => patch("message", e.target.value)} placeholder="Olá! Gostaria de mais informações." /></>}
                        <a className="admin-button secondary" href={publicUrl(company.slug, kind)} target="_blank" rel="noreferrer">Abrir placa {titles[kind]}</a>
                      </div>
                    })}
                  </div>
                  <button className="admin-button primary" type="button" onClick={() => void saveLink(company)} disabled={loading}><Save size={16} /> Salvar configuração</button>
                  <button className="admin-button danger" type="button" onClick={() => void deleteCompany(company)} disabled={loading}><Trash2 size={16} /> Apagar empresa</button>
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
