import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, Edit3, MapPin, Phone, ReceiptText, UserRound } from "lucide-react";
import { QualityBadge, StatusBadge } from "@/components/status-badge";
import { getExpediente } from "@/lib/data";
import { currencyFormatter, formatDate, initials } from "@/lib/format";

export default async function ExpedienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getExpediente(decodeURIComponent(id));
  if (!row) notFound();

  return (
    <div className="page-wrap detail-page">
      <Link href="/expedientes" className="back-link"><ArrowLeft size={17} /> Volver a expedientes</Link>
      <header className="page-header page-header-row detail-header">
        <div>
          <p className="eyebrow">Detalle del expediente</p>
          <h1>{row.id_expediente}</h1>
          <div className="badge-line"><StatusBadge status={row.estado_proceso} /><QualityBadge status={row.quality_status} /></div>
        </div>
        <Link href={`/expedientes/${row.id_expediente}/editar`} className="button button-primary"><Edit3 size={17} /> Editar registro</Link>
      </header>

      <section className="detail-metrics">
        <article><CircleDollarSign size={20} /><span><small>Valor de la deuda</small><strong>{currencyFormatter.format(row.valor_deuda)}</strong></span></article>
        <article><ReceiptText size={20} /><span><small>Tipo de impuesto</small><strong>{row.tipo_impuesto}</strong></span></article>
        <article><CalendarDays size={20} /><span><small>Mandamiento</small><strong>{formatDate(row.fecha_mandamiento)}</strong></span></article>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Identificación</p><h2>Contribuyente</h2></div></div>
          <div className="contributor-card"><span className="avatar">{initials(row.nombre_contribuyente)}</span><div><strong>{row.nombre_contribuyente}</strong><small>Documento {row.documento}</small></div></div>
          <dl className="detail-list">
            <div><dt><MapPin size={17} /> Dirección de notificación</dt><dd>{row.direccion_notificacion ?? "No registrada"}</dd></div>
            <div><dt><Phone size={17} /> Teléfono</dt><dd>{row.telefono ?? "No registrado"}</dd></div>
          </dl>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Proceso</p><h2>Información del cobro</h2></div></div>
          <dl className="detail-list compact">
            <div><dt>Vigencia fiscal</dt><dd>{row.vigencia_fiscal}</dd></div>
            <div><dt>Estado</dt><dd><StatusBadge status={row.estado_proceso} /></dd></div>
            <div><dt>Fila de origen</dt><dd>{row.source_row}</dd></div>
            <div><dt>Control de calidad</dt><dd><QualityBadge status={row.quality_status} /></dd></div>
          </dl>
          {row.quality_notes.length > 0 ? <div className="observation-box"><UserRound size={18} /><div><strong>Observación de importación</strong><p>{row.quality_notes.join(" · ")}</p></div></div> : null}
        </section>
      </div>
    </div>
  );
}
