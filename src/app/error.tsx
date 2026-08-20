"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section className="center-state">
      <AlertTriangle size={36} aria-hidden="true" />
      <h1>No pudimos cargar esta vista</h1>
      <p>Verifica la conexión con Supabase o vuelve a intentarlo.</p>
      <button className="button button-primary" onClick={retry}>
        Reintentar
      </button>
    </section>
  );
}
