export type TaxType =
  | "Predial unificado"
  | "Industria y comercio"
  | "Vehículos automotores";

export type ProcessStatus =
  | "Persuasivo"
  | "Coactivo"
  | "Archivado"
  | "Cerrado"
  | "Sin definir";

export type QualityStatus = "Válido" | "Observación";

export interface Expediente {
  id_expediente: string;
  documento: string;
  nombre_contribuyente: string;
  tipo_impuesto: TaxType;
  vigencia_fiscal: number;
  valor_deuda: number;
  fecha_mandamiento: string;
  estado_proceso: ProcessStatus;
  direccion_notificacion: string | null;
  telefono: string | null;
  quality_status: QualityStatus;
  quality_notes: string[];
  source_row: number;
  updated_at?: string;
}

export interface ImportSummary {
  generated_at: string;
  source_rows: number;
  accepted_rows: number;
  rejected_rows: number;
  flagged_rows: number;
  contributors: number;
  debt_total: number;
  missing_optional: Record<string, number>;
  rejection_reason_counts: Record<string, number>;
}

export interface Rejection {
  source_row: number;
  id_expediente: string;
  reasons: string[];
}
