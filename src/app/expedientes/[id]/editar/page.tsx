import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getExpediente } from "@/lib/data";
import { EditForm } from "./edit-form";

export const metadata = { title: "Editar expediente" };

export default async function EditExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getExpediente(decodeURIComponent(id));
  if (!row) notFound();

  return (
    <div className="page-wrap narrow-page">
      <Link href={`/expedientes/${row.id_expediente}`} className="back-link"><ArrowLeft size={17} /> Volver al detalle</Link>
      <header className="page-header"><p className="eyebrow">Actualización controlada</p><h1>Editar {row.id_expediente}</h1><p>Las restricciones de la base de datos vuelven a validar los campos antes de guardar.</p></header>
      <section className="panel"><EditForm row={row} /></section>
    </div>
  );
}
