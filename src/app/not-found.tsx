import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <section className="center-state">
      <FileQuestion size={36} aria-hidden="true" />
      <h1>Expediente no encontrado</h1>
      <p>El identificador no existe o el registro no fue cargado.</p>
      <Link className="button button-primary" href="/expedientes">
        Volver al listado
      </Link>
    </section>
  );
}
