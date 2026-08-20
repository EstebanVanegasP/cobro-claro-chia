import { CheckCircle2, FileWarning, ShieldCheck, TriangleAlert } from "lucide-react";
import { DataSourcePill } from "@/components/data-source-pill";
import { getImportAudit } from "@/lib/data";
import { numberFormatter } from "@/lib/format";

export const metadata = { title: "Calidad de datos" };

export default async function DataQualityPage() {
  const { summary, rejections } = await getImportAudit();
  return (
    <div className="page-wrap">
      <header className="page-header page-header-row"><div><p className="eyebrow">Auditoría de importación</p><h1>Calidad de datos</h1><p>Cada decisión conserva evidencia y evita inventar información sensible.</p></div><DataSourcePill /></header>

      <section className="metric-grid quality-metric-grid">
        <article className="metric-card"><span className="metric-icon"><ShieldCheck size={20} /></span><div><small>Filas recibidas</small><strong>{numberFormatter.format(summary.source_rows)}</strong><span>Grano: un expediente por fila</span></div></article>
        <article className="metric-card"><span className="metric-icon"><CheckCircle2 size={20} /></span><div><small>Registros cargados</small><strong>{numberFormatter.format(summary.accepted_rows)}</strong><span>{Math.round((summary.accepted_rows / summary.source_rows) * 100)}% del archivo</span></div></article>
        <article className="metric-card"><span className="metric-icon"><FileWarning size={20} /></span><div><small>Registros rechazados</small><strong>{numberFormatter.format(summary.rejected_rows)}</strong><span>Sin correcciones especulativas</span></div></article>
        <article className="metric-card"><span className="metric-icon"><TriangleAlert size={20} /></span><div><small>Con observación</small><strong>{numberFormatter.format(summary.flagged_rows)}</strong><span>Estado original vacío</span></div></article>
      </section>

      <div className="quality-layout">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Política aplicada</p><h2>Reglas de depuración</h2></div></div>
          <ol className="rules-list">
            <li><span>01</span><div><strong>Normalización sin pérdida</strong><p>Se eliminan espacios y separadores de documento; se unifican mayúsculas, nombres de impuesto, estados, fechas y moneda.</p></div></li>
            <li><span>02</span><div><strong>Duplicados exactos</strong><p>Se conserva la primera fila y se registra cada repetición como no cargada.</p></div></li>
            <li><span>03</span><div><strong>Conflictos y valores imposibles</strong><p>Un mismo identificador con datos diferentes, una deuda no positiva, una fecha imposible, documento ausente o vigencia futura se rechazan.</p></div></li>
            <li><span>04</span><div><strong>Ausencias no críticas</strong><p>Dirección y teléfono pueden quedar vacíos. Un estado vacío se conserva como “Sin definir” y se marca para revisión.</p></div></li>
          </ol>
        </section>
        <aside className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Evidencia</p><h2>Motivos de rechazo</h2></div></div>
          <div className="reason-list">{Object.entries(summary.rejection_reason_counts).sort(([, a], [, b]) => b - a).map(([reason, count]) => <div key={reason}><span>{reason}</span><strong>{count}</strong></div>)}</div>
          <p className="note-text">Una fila puede tener más de un motivo; por eso la suma por motivo puede superar el total rechazado.</p>
        </aside>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading"><div><p className="eyebrow">Trazabilidad</p><h2>Registros no cargados</h2></div><span className="result-count">{rejections.length} filas</span></div>
        <div className="table-scroll rejection-table"><table><thead><tr><th>Fila CSV</th><th>Identificador</th><th>Motivo</th></tr></thead><tbody>{rejections.map((row) => <tr key={`${row.source_row}-${row.id_expediente}`}><td>{row.source_row}</td><td><code>{row.id_expediente}</code></td><td>{row.reasons.join(" · ")}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
