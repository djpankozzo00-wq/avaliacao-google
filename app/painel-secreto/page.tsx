"use client"

import { FormEvent, useCallback, useState } from "react"
import { Copy, ExternalLink, LogOut, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react"

type SignDesign = { background: string; border: string; text: string; title: string; stars: string; qrFrame: string; shine: number; matte: number; radius: number; titleFont: string; bodyFont: string; }
type SignConfigs = { design?: SignDesign; google: { enabled: boolean }; pix: { enabled: boolean; pix_key: string; recipient: string; city: string }; instagram: { enabled: boolean; username: string; url: string }; wifi: { enabled: boolean; network: string; password: string; security: string }; whatsapp: { enabled: boolean; phone: string; message: string } }
type Company = { id: string; name: string; slug: string; review_url: string; sign_configs?: SignConfigs; created_at?: string; updated_at?: string }
const defaultDesign: SignDesign = { background: "#292925", border: "#7d6a46", text: "#e5c98d", title: "#e7c986", stars: "#e5c98d", qrFrame: "#f1d9a1", shine: 19, matte: 42, radius: 30, titleFont: "Arial", bodyFont: "Arial" }
const emptySigns: SignConfigs = { design: defaultDesign, google: { enabled: false }, pix: { enabled: false, pix_key: "", recipient: "", city: "" }, instagram: { enabled: false, username: "", url: "" }, wifi: { enabled: false, network: "", password: "", security: "WPA" }, whatsapp: { enabled: false, phone: "", message: "" } }
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
      const response = await fetch("/api/admin/companies", { cache: "no-store", credentials: "include" })
      if (response.status === 401) { setAuthenticated(false); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as empresas.")
      setCompanies(data)
      setEditUrls(Object.fromEntries(data.map((company: Company) => [company.id, company.review_url])))
      setEditSigns(Object.fromEntries(data.map((company: Company) => [company.id, { ...emptySigns, ...(company.sign_configs || {}), design: { ...defaultDesign, ...((company.sign_configs as any)?.design || {}) } }])))
      setAuthenticated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.")
    } finally { setLoading(false) }
  }, [])


  async function login(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true)
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ password }) })
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
    await fetch("/api/admin/login", { method: "DELETE", credentials: "include" })
    setAuthenticated(false); setCompanies([]); setMessage("Sessão encerrada.")
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setMessage("Link copiado.") }
    catch { setMessage("Não foi possível copiar automaticamente. Selecione e copie o link.") }
  }

  const publicUrl = (slug: string, type = "google") => typeof window === "undefined" ? `/empresa/${slug}?tipo=${type}` : `${window.location.origin}/empresa/${slug}?tipo=${type}`
  const defaultType = (company: Company) => {
    const signs = editSigns[company.id] || { ...emptySigns, ...(company.sign_configs || {}) }
    if (signs.whatsapp?.enabled && signs.whatsapp.phone.trim()) return "whatsapp"
    if (signs.pix?.enabled && signs.pix.pix_key.trim()) return "pix"
    if (signs.wifi?.enabled && signs.wifi.network.trim()) return "wifi"
    if (signs.instagram?.enabled && (signs.instagram.url.trim() || signs.instagram.username.trim())) return "instagram"
    if (signs.google?.enabled && company.review_url) return "google"
    return "whatsapp"
  }

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
              <label htmlFor="review-url">Link de avaliação do Google (opcional)</label>
              <input id="review-url" type="url" value={reviewUrl} onChange={e => setReviewUrl(e.target.value)} placeholder="Preencha somente se quiser a plaquinha Google" />
              <button className="admin-button primary" disabled={loading}><Plus size={17} /> {loading ? "Salvando..." : "Cadastrar e gerar link exclusivo"}</button>
            </form>

            <section className="admin-panel">
              <div className="list-heading"><h2>Empresas cadastradas</h2><button className="admin-button secondary" onClick={() => void loadCompanies()} disabled={loading}><RefreshCw size={15} /> Atualizar</button></div>
              {companies.length === 0 ? <p className="admin-muted">Nenhuma empresa cadastrada ainda.</p> : <div className="company-list">
                {companies.map(company => <article className="company-item" key={company.id}>
                  <h3>{company.name}</h3>
                  <label>Link exclusivo desta empresa</label>
                  <div className="link-row"><input readOnly value={publicUrl(company.slug, defaultType(company))} /><button className="admin-button secondary icon-button" type="button" title="Copiar link exclusivo" onClick={() => void copy(publicUrl(company.slug, defaultType(company)))}><Copy size={16} /></button><a className="admin-button secondary icon-button" href={publicUrl(company.slug, defaultType(company))} target="_blank" rel="noreferrer" title="Abrir página"><ExternalLink size={16} /></a></div>
                  
                  <div className="sign-config-editor">
                    <h4>Configurar uma plaquinha por vez</h4>
                    <div className="sign-design-editor">
                      <h4>🎨 Personalizar aparência da plaquinha</h4>
                      <p className="admin-muted">Veja o exemplo mudar na hora. Salve para aplicar na placa pública.</p>
                      {(() => {
                        const design = { ...defaultDesign, ...(editSigns[company.id]?.design || {}) }
                        const updateDesign = (field: keyof SignDesign, value: string | number) => setEditSigns(old => {
                          const current = old[company.id] || { ...emptySigns }
                          return { ...old, [company.id]: { ...current, design: { ...defaultDesign, ...(current.design || {}), [field]: value } } }
                        })
                        const previewStyle = { backgroundColor: design.background, color: design.text, border: `3px solid ${design.border}`, borderRadius: design.radius, boxShadow: `inset 0 0 ${Math.round(design.shine / 4)}px rgba(255,255,255,${design.shine / 250}), inset 0 -12px ${Math.round(design.matte / 2 + 8)}px rgba(0,0,0,${design.matte / 100}), 0 8px 22px rgba(0,0,0,.3)`, backgroundImage: `linear-gradient(115deg, rgba(255,255,255,${design.shine / 350}) 0%, transparent 32%, rgba(255,255,255,${design.shine / 500}) 72%, transparent 100%)` }
                        return <>
                          <div className="sign-design-preview" style={previewStyle}>
                            <div className="design-preview-icon" style={{ color: design.title }}>★</div>
                            <div className="design-preview-stars" style={{ color: design.stars }}>★★★★★</div>
                            <strong style={{ color: design.title, fontFamily: design.titleFont }}>Avalie nossa empresa!</strong>
                            <div className="design-preview-qr" style={{ borderColor: design.qrFrame }}><span /></div>
                            <small style={{ color: design.text, fontFamily: design.bodyFont }}>QR CODE</small>
                            <div className="design-preview-footer" style={{ borderColor: design.border }} />
                          </div>
                          <div className="sign-design-controls">
                            <label>Fonte do título<select value={design.titleFont} onChange={e => updateDesign("titleFont", e.target.value)}><option value="Arial">Arial — moderna</option><option value="Georgia">Georgia — elegante</option><option value="Times New Roman">Times New Roman — clássica</option><option value="Verdana">Verdana — legível</option><option value="Trebuchet MS">Trebuchet MS — arredondada</option><option value="Impact">Impact — forte</option><option value="Courier New">Courier New — máquina de escrever</option><option value="cursive">Cursiva — manuscrita</option></select></label>
                            <label>Fonte dos textos<select value={design.bodyFont} onChange={e => updateDesign("bodyFont", e.target.value)}><option value="Arial">Arial — moderna</option><option value="Georgia">Georgia — elegante</option><option value="Times New Roman">Times New Roman — clássica</option><option value="Verdana">Verdana — legível</option><option value="Trebuchet MS">Trebuchet MS — arredondada</option><option value="Impact">Impact — forte</option><option value="Courier New">Courier New — máquina de escrever</option><option value="cursive">Cursiva — manuscrita</option></select></label>
                            {([{ key: "background", label: "Cor de fundo" }, { key: "border", label: "Cor da borda" }, { key: "text", label: "Textos e detalhes" }, { key: "title", label: "Título e ícone" }, { key: "stars", label: "Estrelas" }, { key: "qrFrame", label: "Moldura do QR Code" }] as const).map(item => <label className="design-color-field" key={item.key}>{item.label}<input type="color" value={design[item.key]} onChange={e => updateDesign(item.key, e.target.value)} /><code>{design[item.key]}</code></label>)}
                            <label>Brilho metálico: {design.shine}%<input type="range" min="0" max="100" value={design.shine} onChange={e => updateDesign("shine", Number(e.target.value))} /></label>
                            <label>Fosco: {design.matte}%<input type="range" min="0" max="100" value={design.matte} onChange={e => updateDesign("matte", Number(e.target.value))} /></label>
                            <label>Arredondamento da borda: {design.radius}px<input type="range" min="0" max="36" value={design.radius} onChange={e => updateDesign("radius", Number(e.target.value))} /></label>
                            <button className="admin-button secondary" type="button" onClick={() => setEditSigns(old => ({ ...old, [company.id]: { ...(old[company.id] || emptySigns), design: { ...defaultDesign, ...(old[company.id]?.design || {}), background: defaultDesign.background, border: defaultDesign.border, text: defaultDesign.text, title: defaultDesign.title, stars: defaultDesign.stars, qrFrame: defaultDesign.qrFrame } } }))}>Restaurar todas as cores originais</button>
                            <button className="admin-button secondary" type="button" onClick={() => setEditSigns(old => ({ ...old, [company.id]: { ...(old[company.id] || emptySigns), design: { ...defaultDesign } } }))}>Restaurar aparência original</button>
                          </div>
                        </>
                      })()}
                    </div>

                    <div className="sign-picker">{([{ id: "google", label: "Avaliação Google" }, { id: "whatsapp", label: "WhatsApp" }, { id: "pix", label: "Pix" }, { id: "wifi", label: "Wi-Fi" }, { id: "instagram", label: "Instagram" }] as const).map(option => <button type="button" key={option.id} className={"admin-button " + ((selectedSigns[company.id] || "whatsapp") === option.id ? "primary" : "secondary")} onClick={() => setSelectedSigns(old => ({ ...old, [company.id]: option.id }))}>{option.label}</button>)}</div>
                    {([selectedSigns[company.id] || "whatsapp"] as (keyof SignConfigs)[]).map(kind => {
                      const cfg = editSigns[company.id]?.[kind] || emptySigns[kind]
                      const patch = (field: string, value: string | boolean) => setEditSigns(old => ({ ...old, [company.id]: { ...(old[company.id] || emptySigns), [kind]: { ...((old[company.id] || emptySigns)[kind]), [field]: value } } as SignConfigs }))
                      const titles = { google: "Avaliação Google", pix: "Pagamento Pix", instagram: "Instagram", wifi: "Wi-Fi", whatsapp: "WhatsApp" }
                      return <div className="sign-config-item" key={kind}>
                        <label className="sign-enable"><input type="checkbox" checked={cfg.enabled} onChange={e => patch("enabled", e.target.checked)} /> Ativar placa de {titles[kind]}</label>
                        {kind === "google" && <><label>Link de avaliação do Google</label><input type="url" value={editUrls[company.id] ?? company.review_url} onChange={e => setEditUrls(old => ({ ...old, [company.id]: e.target.value }))} placeholder="https://g.page/r/.../review" /></>}
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
