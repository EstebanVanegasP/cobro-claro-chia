import Link from "next/link";
import { BarChart3, Database, FileSearch, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/expedientes", label: "Expedientes", icon: FileSearch },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/calidad-datos", label: "Calidad de datos", icon: Database },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Cobro Claro, inicio">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <span>
            <strong>Cobro Claro</strong>
            <small>Gestión municipal</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Navegación principal">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="live-dot" aria-hidden="true" />
          <div>
            <strong>Prueba técnica</strong>
            <small>Municipio de Chía · 2026</small>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
