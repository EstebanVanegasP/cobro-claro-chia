import { BarChart3, CircleDollarSign, ListChecks, Trophy } from "lucide-react";
import { DataSourcePill } from "@/components/data-source-pill";
import { getAllExpedientes } from "@/lib/data";
import { currencyFormatter, initials, numberFormatter } from "@/lib/format";

export const metadata = { title: "Reportes" };

export default async function ReportsPage() {
  const rows = await getAllExpedientes();
  const totalDebt = rows.reduce((sum, row) => sum + row.valor_deuda, 0);
  const debtByTax = Object.entries(rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.tipo_impuesto] = (acc[row.tipo_impuesto] ?? 0) + row.valor_deuda;
    return acc;
  }, {})).sort(([, a], [, b]) => b - a);
  const countByStatus = Object.entries(rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.estado_proceso] = (acc[row.estado_proceso] ?? 0) + 1;
    return acc;
  }, {})).sort(([, a], [, b]) => b - a);
  const debtors = new Map<string, { documento: string; nombre: string; deuda: number; expedientes: number }>();
  for (const row of rows) {
    const existing = debtors.get(row.documento) ?? { documento: row.documento, nombre: row.nombre_contribuyente, deuda: 0, expedientes: 0 };
    existing.deuda += row.valor_deuda;
    existing.expedientes += 1;
    debtors.set(row.documento, existing);
  }
  const topDebtors = [...debtors.values()].sort((a, b) => b.deuda - a.deuda).slice(0, 10);
  const maxStatus = Math.max(...countByStatus.map(([, count]) => count));

  return (
    <div className="page-wrap">
      <header className="page-header page-header-row"><div><p className="eyebrow">Análisis de cartera</p><h1>Reportes</h1><p>Las tres cifras solicitadas, calculadas únicamente sobre registros aceptados.</p></div><DataSourcePill /></header>

      <section className="report-grid">
        <article className="panel report-card">
          <div className="report-card-title"><span><CircleDollarSign size={20} /></span><div><small>Reporte 01</small><h2>Deuda por impuesto</h2></div></div>
          <strong className="report-total">{currencyFormatter.format(totalDebt)}</strong>
          <div className="stacked-bar" aria-label="Distribución porcentual de deuda">{debtByTax.map(([tax, amount], index) => <span key={tax} className={`segment segment-${index + 1}`} style={{ width: `${(amount / totalDebt) * 100}%` }} title={`${tax}: ${currencyFormatter.format(amount)}`} />)}</div>
          <div className="legend-list">{debtByTax.map(([tax, amount], index) => <div key={tax}><span><i className={`legend-dot segment-${index + 1}`} />{tax}</span><strong>{currencyFormatter.format(amount)}</strong></div>)}</div>
        </article>

        <article className="panel report-card">
          <div className="report-card-title"><span><ListChecks size={20} /></span><div><small>Reporte 02</small><h2>Expedientes por estado</h2></div></div>
          <strong className="report-total">{numberFormatter.format(rows.length)} <small>expedientes</small></strong>
          <div className="horizontal-bars">{countByStatus.map(([status, count]) => <div key={status}><div><span>{status}</span><strong>{count}</strong></div><div className="bar-track"><span style={{ width: `${(count / maxStatus) * 100}%` }} /></div></div>)}</div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Reporte 03</p><h2>Diez contribuyentes con mayor deuda acumulada</h2></div><Trophy size={23} className="heading-icon" /></div>
        <div className="top-debtors">{topDebtors.map((debtor, index) => <article key={debtor.documento}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span className="avatar avatar-small">{initials(debtor.nombre)}</span><div><strong>{debtor.nombre}</strong><small>{debtor.documento} · {debtor.expedientes} {debtor.expedientes === 1 ? "expediente" : "expedientes"}</small></div><strong className="debtor-amount">{currencyFormatter.format(debtor.deuda)}</strong></article>)}</div>
      </section>

      <p className="report-method"><BarChart3 size={16} /> Identidad del contribuyente: documento normalizado. Los nombres iguales con documentos distintos no se fusionan.</p>
    </div>
  );
}
