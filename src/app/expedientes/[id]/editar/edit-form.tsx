"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { updateExpediente, type EditState } from "@/app/expedientes/actions";
import type { Expediente, ProcessStatus, TaxType } from "@/lib/types";

const initialState: EditState = {};
const taxTypes: TaxType[] = ["Predial unificado", "Industria y comercio", "Vehículos automotores"];
const statuses: ProcessStatus[] = ["Persuasivo", "Coactivo", "Archivado", "Cerrado", "Sin definir"];

export function EditForm({ row }: { row: Expediente }) {
  const [state, formAction, pending] = useActionState(updateExpediente, initialState);

  return (
    <form action={formAction} className="edit-form">
      <input type="hidden" name="id_expediente" value={row.id_expediente} />
      {state.error ? <div className="form-alert" role="alert"><AlertCircle size={18} />{state.error}</div> : null}

      <fieldset>
        <legend>Datos del contribuyente</legend>
        <div className="form-grid">
          <label className="field field-wide"><span>Nombre o razón social</span><input name="nombre" defaultValue={row.nombre_contribuyente} required minLength={3} /></label>
          <label className="field"><span>Documento</span><input value={row.documento} disabled /><small>La identidad no se modifica desde el expediente.</small></label>
          <label className="field"><span>Teléfono</span><input name="telefono" defaultValue={row.telefono ?? ""} inputMode="numeric" pattern="[0-9]{7,12}" /></label>
          <label className="field field-wide"><span>Dirección de notificación</span><input name="direccion_notificacion" defaultValue={row.direccion_notificacion ?? ""} maxLength={200} /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Datos del cobro</legend>
        <div className="form-grid">
          <label className="field"><span>Tipo de impuesto</span><select name="tipo_impuesto" defaultValue={row.tipo_impuesto}>{taxTypes.map((tax) => <option key={tax}>{tax}</option>)}</select></label>
          <label className="field"><span>Vigencia fiscal</span><input name="vigencia_fiscal" type="number" min="1900" max="2026" defaultValue={row.vigencia_fiscal} required /></label>
          <label className="field"><span>Valor de la deuda (COP)</span><input name="valor_deuda" type="number" min="1" step="1" defaultValue={row.valor_deuda} required /></label>
          <label className="field"><span>Fecha de mandamiento</span><input name="fecha_mandamiento" type="date" defaultValue={row.fecha_mandamiento} required /></label>
          <label className="field"><span>Estado del proceso</span><select name="estado_proceso" defaultValue={row.estado_proceso}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>
      </fieldset>

      <div className="form-actions">
        <Link className="button button-secondary" href={`/expedientes/${row.id_expediente}`}>Cancelar</Link>
        <button className="button button-primary" type="submit" disabled={pending}><Save size={17} />{pending ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}
