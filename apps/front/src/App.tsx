import { useEffect, useState } from 'react';
import './App.css';

interface HealthResponse {
  status: string;
  service: string;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setError('No se pudo conectar con el backend'));
  }, []);

  return (
    <main>
      <h1>Ledgerly ERP</h1>
      <p>Frontend React + Vite + TypeScript</p>
      <section>
        <h2>Estado del backend</h2>
        {health && (
          <p>
            ✅ {health.service}: <strong>{health.status}</strong>
          </p>
        )}
        {error && <p>❌ {error}</p>}
        {!health && !error && <p>Comprobando…</p>}
      </section>
    </main>
  );
}

export default App;
