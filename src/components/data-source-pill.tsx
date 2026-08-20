import { Cloud, HardDrive } from "lucide-react";
import { dataSourceLabel } from "@/lib/data";

export function DataSourcePill() {
  const label = dataSourceLabel();
  const connected = label.startsWith("Supabase");
  const Icon = connected ? Cloud : HardDrive;

  return (
    <span className={`source-pill ${connected ? "source-connected" : "source-local"}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}
