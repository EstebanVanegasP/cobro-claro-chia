import "server-only";

import localExpedientes from "../../data/processed/expedientes.json";
import localRejections from "../../data/processed/rejections.json";
import localSummary from "../../data/processed/summary.json";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";
import type { Expediente, ImportSummary, Rejection } from "@/lib/types";

const fallbackExpedientes = localExpedientes as Expediente[];
const fallbackSummary = localSummary as ImportSummary;
const fallbackRejections = localRejections as Rejection[];

function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CO");
}

export function dataSourceLabel(): string {
  return hasSupabaseConfig() ? "Supabase conectado" : "Datos locales de demostración";
}

export async function getAllExpedientes(): Promise<Expediente[]> {
  if (!hasSupabaseConfig()) {
    return fallbackExpedientes;
  }

  const { data, error } = await getSupabaseClient()
    .from("expedientes_detalle")
    .select("*")
    .order("id_expediente", { ascending: true })
    .limit(1000);

  if (error) {
    throw new Error(`No se pudieron consultar los expedientes: ${error.message}`);
  }

  return (data ?? []) as Expediente[];
}

export async function getExpedientes(query = ""): Promise<Expediente[]> {
  const rows = await getAllExpedientes();
  const term = searchKey(query.trim());

  if (!term) {
    return rows;
  }

  return rows.filter((row) =>
    [row.id_expediente, row.documento, row.nombre_contribuyente]
      .map(searchKey)
      .some((value) => value.includes(term)),
  );
}

export async function getExpediente(id: string): Promise<Expediente | null> {
  if (!hasSupabaseConfig()) {
    return fallbackExpedientes.find((row) => row.id_expediente === id) ?? null;
  }

  const { data, error } = await getSupabaseClient()
    .from("expedientes_detalle")
    .select("*")
    .eq("id_expediente", id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el expediente: ${error.message}`);
  }

  return (data as Expediente | null) ?? null;
}

export async function getImportAudit(): Promise<{
  summary: ImportSummary;
  rejections: Rejection[];
}> {
  if (!hasSupabaseConfig()) {
    return { summary: fallbackSummary, rejections: fallbackRejections };
  }

  const client = getSupabaseClient();
  const [runResult, rejectionResult] = await Promise.all([
    client.from("import_runs").select("summary").order("created_at", { ascending: false }).limit(1).single(),
    client.from("import_rejections").select("source_row,id_expediente,reasons").order("source_row"),
  ]);

  if (runResult.error) {
    throw new Error(`No se pudo consultar la auditoría: ${runResult.error.message}`);
  }
  if (rejectionResult.error) {
    throw new Error(`No se pudieron consultar los rechazos: ${rejectionResult.error.message}`);
  }

  return {
    summary: runResult.data.summary as ImportSummary,
    rejections: (rejectionResult.data ?? []) as Rejection[],
  };
}
