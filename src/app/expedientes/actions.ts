"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

export interface EditState {
  error?: string;
}

const editSchema = z.object({
  id_expediente: z.string().trim().min(1),
  nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  direccion_notificacion: z.string().trim().max(200),
  telefono: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{7,12}$/.test(value), "El teléfono debe contener entre 7 y 12 dígitos."),
  tipo_impuesto: z.enum(["Predial unificado", "Industria y comercio", "Vehículos automotores"]),
  vigencia_fiscal: z.coerce.number().int().min(1900).max(2026),
  valor_deuda: z.coerce.number().int().positive("La deuda debe ser mayor que cero."),
  fecha_mandamiento: z.iso.date(),
  estado_proceso: z.enum(["Persuasivo", "Coactivo", "Archivado", "Cerrado", "Sin definir"]),
});

export async function updateExpediente(_state: EditState, formData: FormData): Promise<EditState> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los campos del formulario." };
  }

  if (!hasSupabaseConfig()) {
    return { error: "La edición requiere configurar la conexión con Supabase." };
  }

  const value = parsed.data;
  const { error } = await getSupabaseClient().rpc("actualizar_expediente", {
    p_id_expediente: value.id_expediente,
    p_nombre: value.nombre,
    p_direccion_notificacion: value.direccion_notificacion,
    p_telefono: value.telefono,
    p_tipo_impuesto: value.tipo_impuesto,
    p_vigencia_fiscal: value.vigencia_fiscal,
    p_valor_deuda: value.valor_deuda,
    p_fecha_mandamiento: value.fecha_mandamiento,
    p_estado_proceso: value.estado_proceso,
  });

  if (error) {
    return { error: `No se pudo guardar el expediente: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/expedientes");
  revalidatePath(`/expedientes/${value.id_expediente}`);
  revalidatePath("/reportes");
  redirect(`/expedientes/${value.id_expediente}?actualizado=1`);
}
