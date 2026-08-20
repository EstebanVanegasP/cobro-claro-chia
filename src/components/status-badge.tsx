import type { ProcessStatus, QualityStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ProcessStatus }) {
  const slug = status.toLowerCase().replace(" ", "-");
  return <span className={`status-badge status-${slug}`}>{status}</span>;
}

export function QualityBadge({ status }: { status: QualityStatus }) {
  return (
    <span className={`quality-badge ${status === "Válido" ? "quality-valid" : "quality-warning"}`}>
      {status}
    </span>
  );
}
