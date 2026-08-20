import Link from "next/link";
import { ArrowRight, CircleDollarSign, FileCheck2, FileWarning, Users } from "lucide-react";
import { DataSourcePill } from "@/components/data-source-pill";
import { StatusBadge } from "@/components/status-badge";
import { getAllExpedientes, getImportAudit } from "@/lib/data";
import { currencyFormatter, numberFormatter } from "@/lib/format";
import type { TaxType } from "@/lib/types";

const taxColors: Record<TaxType, string> = {
  "Predial unificado": "#2563eb",
  "Industria y comercio": "#7c3aed",
  "Vehículos automotores": "#0f9f74",
};

export default async function DashboardPage() {
  const [rows, audit] = await Promise.all([getAllExpedientes(), getImportAudit()]);
  const totalDebt = rows.reduce((sum, row) => sum + row.valor_deuda, 0);
  const contributors = new Set(rows.map((row) => row.documento)).size;
  const byTax = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.tipo_impuesto] = (acc[row.tipo_impuesto] ?? 0) + row.valor_deuda;
    return acc;
  }, {});
  const largest = [...rows].sort((a, b) => b.valor_deuda - a.valor_deuda).slice(0, 5);

  return (
    <div className="page-wrap">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Panel de control</p>
          <h1>Una vista clara de la cartera</h1>
          <p>Información depurada de expedientes de cobro del municipio de Chía.</p>
        </div>
        <DataSourcePill />
      </header>

      <section className="metric-grid" aria-label="Indicadores principales">
        <article className="metric-card metric-featured">
          <span className="metric-icon"><CircleDollarSign size={20} /></span>
          <div>
            <small>Deuda total cargada</small>
            <strong>{currencyFormatter.format(totalDebt)}</strong>
            <span>Solo registros validados</span>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><FileCheck2 size={20} /></span>
          <div>
            <small>Expedientes</small>
            <strong>{numberFormatter.format(rows.length)}</strong>
            <span>{audit.summary.flagged_rows} con observación</span>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><Users size={20} /></span>
          <div>
            <small>Contribuyentes</small>
            <strong>{numberFormatter.format(contributors)}</strong>
            <span>Identificados por documento</span>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><FileWarning size={20} /></span>
          <div>
            <small>Filas no cargadas</small>
            <strong>{numberFormatter.format(audit.summary.rejected_rows)}</strong>
            <span>Con motivo auditable</span>
          </div>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Distribución</p>
              <h2>Deuda por tipo de impuesto</h2>
            </div>
            <Link href="/reportes" className="text-link">Ver reporte <ArrowRight size={15} /></Link>
          </div>
          <div className="tax-list">
            {Object.entries(byTax)
              .sort(([, a], [, b]) => b - a)
              .map(([tax, amount]) => (
                <div className="tax-row" key={tax}>
                  <div className="tax-row-label">
                    <span><i style={{ background: taxColors[tax as TaxType] }} />{tax}</span>
                    <strong>{currencyFormatter.format(amount)}</strong>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${Math.max((amount / totalDebt) * 100, 2)}%`,
                        background: taxColors[tax as TaxType],
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>

        <aside className="panel quality-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trazabilidad</p>
              <h2>Control de importación</h2>
            </div>
          </div>
          <div className="quality-ring" style={{ "--score": `${Math.round((rows.length / audit.summary.source_rows) * 100)}%` } as React.CSSProperties}>
            <strong>{Math.round((rows.length / audit.summary.source_rows) * 100)}%</strong>
            <span>cargado</span>
          </div>
          <dl className="quality-stats">
            <div><dt>Recibidas</dt><dd>{audit.summary.source_rows}</dd></div>
            <div><dt>Aceptadas</dt><dd>{audit.summary.accepted_rows}</dd></div>
            <div><dt>Rechazadas</dt><dd>{audit.summary.rejected_rows}</dd></div>
          </dl>
          <Link href="/calidad-datos" className="button button-secondary button-full">
            Revisar reglas y rechazos
          </Link>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Prioridad</p>
            <h2>Expedientes de mayor deuda</h2>
          </div>
          <Link href="/expedientes" className="text-link">Ver todos <ArrowRight size={15} /></Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Expediente</th><th>Contribuyente</th><th>Estado</th><th className="align-right">Deuda</th></tr></thead>
            <tbody>
              {largest.map((row) => (
                <tr key={row.id_expediente}>
                  <td><Link className="id-link" href={`/expedientes/${row.id_expediente}`}>{row.id_expediente}</Link></td>
                  <td><strong>{row.nombre_contribuyente}</strong><small>{row.documento}</small></td>
                  <td><StatusBadge status={row.estado_proceso} /></td>
                  <td className="align-right amount-cell">{currencyFormatter.format(row.valor_deuda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
