export default function HomePage() {
  return (
    <main className="review-page" style={{ cursor: "default", userSelect: "text" }}>
      <section className="review-card">
        <div className="admin-lock" style={{ fontSize: 42, marginBottom: 12 }}>⭐</div>
        <h1 style={{ fontSize: "clamp(30px, 8vw, 42px)" }}>Avaliações Google</h1>
        <p className="subtitle">Cada empresa tem seu próprio link de avaliação.</p>
        <p style={{ maxWidth: 320, color: "#bdbdbd", lineHeight: 1.6, fontSize: 16 }}>
          Para avaliar uma empresa, abra o link exclusivo ou escaneie o QR Code fornecido por ela.
        </p>
      </section>
    </main>
  )
}
