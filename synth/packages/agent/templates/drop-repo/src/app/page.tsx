export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <h1>__DROP_NAME__</h1>
        <p>__DESCRIPTION__</p>
        <div className="card">
          <h2>Contract</h2>
          <p>Address: <span className="mono">__CONTRACT_ADDRESS__</span></p>
          <p>Chain: __CHAIN__</p>
        </div>
      </section>
    </main>
  );
}
