import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DataSourcePill } from "@/components/data-source-pill";
import { QualityBadge, StatusBadge } from "@/components/status-badge";
import { getExpedientes } from "@/lib/data";
import { currencyFormatter, numberFormatter } from "@/lib/format";

const PAGE_SIZE = 25;

export const metadata = { title: "Expedientes" };

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const rows = await getExpedientes(query);
  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (target: number) => `/expedientes?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(target) })}`;

  return (
    <div className="page-wrap">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Gestión de cartera</p>
          <h1>Expedientes</h1>
          <p>Consulta y abre el detalle de cada registro validado.</p>
        </div>
        <DataSourcePill />
      </header>

      <section className="panel table-panel">
        <div className="list-toolbar">
          <form className="search-form" role="search">
            <Search size={18} aria-hidden="true" />
            <label className="sr-only" htmlFor="q">Buscar expediente</label>
            <input id="q" name="q" defaultValue={query} placeholder="Buscar por expediente, documento o nombre" />
            <button className="button button-primary" type="submit">Buscar</button>
          </form>
          <span className="result-count">{numberFormatter.format(rows.length)} resultados</span>
        </div>

        {pageRows.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Expediente</th><th>Contribuyente</th><th>Impuesto</th><th>Estado</th><th>Calidad</th><th className="align-right">Deuda</th></tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id_expediente}>
                      <td><Link className="id-link" href={`/expedientes/${row.id_expediente}`}>{row.id_expediente}</Link><small>Vigencia {row.vigencia_fiscal}</small></td>
                      <td><strong>{row.nombre_contribuyente}</strong><small>{row.documento}</small></td>
                      <td>{row.tipo_impuesto}</td>
                      <td><StatusBadge status={row.estado_proceso} /></td>
                      <td><QualityBadge status={row.quality_status} /></td>
                      <td className="align-right amount-cell">{currencyFormatter.format(row.valor_deuda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="pagination" aria-label="Paginación">
              <span>Página {page} de {totalPages}</span>
              <div>
                {page > 1 ? <Link className="icon-button" href={pageHref(page - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></Link> : <span className="icon-button disabled"><ChevronLeft size={18} /></span>}
                {page < totalPages ? <Link className="icon-button" href={pageHref(page + 1)} aria-label="Página siguiente"><ChevronRight size={18} /></Link> : <span className="icon-button disabled"><ChevronRight size={18} /></span>}
              </div>
            </nav>
          </>
        ) : (
          <div className="empty-state"><Search size={32} /><h2>Sin coincidencias</h2><p>Prueba con otro identificador, documento o nombre.</p><Link className="button button-secondary" href="/expedientes">Limpiar búsqueda</Link></div>
        )}
      </section>
    </div>
  );
}
