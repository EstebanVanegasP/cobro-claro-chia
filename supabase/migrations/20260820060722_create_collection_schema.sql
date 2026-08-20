create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.contribuyentes (
  documento text primary key,
  nombre text not null,
  direccion_notificacion text,
  telefono text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contribuyentes_documento_formato check (documento ~ '^[0-9]{7,12}$'),
  constraint contribuyentes_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint contribuyentes_telefono_formato check (
    telefono is null or telefono ~ '^[0-9]{7,12}$'
  )
);

create table public.expedientes (
  id_expediente text primary key,
  documento_contribuyente text not null references public.contribuyentes(documento),
  tipo_impuesto text not null,
  vigencia_fiscal smallint not null,
  valor_deuda bigint not null,
  fecha_mandamiento date not null,
  estado_proceso text not null,
  quality_status text not null default 'Válido',
  quality_notes jsonb not null default '[]'::jsonb,
  source_row integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expedientes_id_no_vacio check (length(btrim(id_expediente)) > 0),
  constraint expedientes_tipo_impuesto_valido check (
    tipo_impuesto in ('Predial unificado', 'Industria y comercio', 'Vehículos automotores')
  ),
  constraint expedientes_vigencia_valida check (vigencia_fiscal between 1900 and 2026),
  constraint expedientes_deuda_positiva check (valor_deuda > 0),
  constraint expedientes_estado_valido check (
    estado_proceso in ('Persuasivo', 'Coactivo', 'Archivado', 'Cerrado', 'Sin definir')
  ),
  constraint expedientes_calidad_valida check (quality_status in ('Válido', 'Observación')),
  constraint expedientes_notas_array check (jsonb_typeof(quality_notes) = 'array')
);

create table public.import_runs (
  id bigint generated always as identity primary key,
  source_file text not null,
  source_rows integer not null check (source_rows >= 0),
  accepted_rows integer not null check (accepted_rows >= 0),
  rejected_rows integer not null check (rejected_rows >= 0),
  flagged_rows integer not null check (flagged_rows >= 0),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_runs_balance check (source_rows = accepted_rows + rejected_rows)
);

create table public.import_rejections (
  id bigint generated always as identity primary key,
  source_row integer not null,
  id_expediente text,
  reasons jsonb not null,
  created_at timestamptz not null default now(),
  constraint import_rejections_reasons_array check (jsonb_typeof(reasons) = 'array')
);

create index expedientes_documento_idx on public.expedientes(documento_contribuyente);
create index expedientes_tipo_impuesto_idx on public.expedientes(tipo_impuesto);
create index expedientes_estado_idx on public.expedientes(estado_proceso);
create index expedientes_valor_deuda_idx on public.expedientes(valor_deuda desc);
create index contribuyentes_nombre_idx on public.contribuyentes using gin (
  to_tsvector('spanish', nombre)
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger contribuyentes_set_updated_at
before update on public.contribuyentes
for each row execute function private.set_updated_at();

create trigger expedientes_set_updated_at
before update on public.expedientes
for each row execute function private.set_updated_at();

create view public.expedientes_detalle
with (security_invoker = true)
as
select
  e.id_expediente,
  e.documento_contribuyente as documento,
  c.nombre as nombre_contribuyente,
  e.tipo_impuesto,
  e.vigencia_fiscal,
  e.valor_deuda,
  e.fecha_mandamiento,
  e.estado_proceso,
  c.direccion_notificacion,
  c.telefono,
  e.quality_status,
  e.quality_notes,
  e.source_row,
  e.updated_at
from public.expedientes e
join public.contribuyentes c on c.documento = e.documento_contribuyente;

create or replace function public.actualizar_expediente(
  p_id_expediente text,
  p_nombre text,
  p_direccion_notificacion text,
  p_telefono text,
  p_tipo_impuesto text,
  p_vigencia_fiscal smallint,
  p_valor_deuda bigint,
  p_fecha_mandamiento date,
  p_estado_proceso text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_documento text;
begin
  select documento_contribuyente
  into v_documento
  from public.expedientes
  where id_expediente = p_id_expediente;

  if v_documento is null then
    raise exception 'Expediente no encontrado';
  end if;

  update public.contribuyentes
  set
    nombre = p_nombre,
    direccion_notificacion = nullif(btrim(p_direccion_notificacion), ''),
    telefono = nullif(btrim(p_telefono), '')
  where documento = v_documento;

  update public.expedientes
  set
    tipo_impuesto = p_tipo_impuesto,
    vigencia_fiscal = p_vigencia_fiscal,
    valor_deuda = p_valor_deuda,
    fecha_mandamiento = p_fecha_mandamiento,
    estado_proceso = p_estado_proceso
  where id_expediente = p_id_expediente;
end;
$$;

revoke all on function public.actualizar_expediente(
  text, text, text, text, text, smallint, bigint, date, text
) from public, anon, authenticated;

alter table public.contribuyentes enable row level security;
alter table public.expedientes enable row level security;
alter table public.import_runs enable row level security;
alter table public.import_rejections enable row level security;

revoke all on table public.contribuyentes from anon, authenticated;
revoke all on table public.expedientes from anon, authenticated;
revoke all on table public.import_runs from anon, authenticated;
revoke all on table public.import_rejections from anon, authenticated;
revoke all on table public.expedientes_detalle from anon, authenticated;

grant select on table public.contribuyentes to anon;
grant update (nombre, direccion_notificacion, telefono) on table public.contribuyentes to anon;
grant select on table public.expedientes to anon;
grant update (
  tipo_impuesto,
  vigencia_fiscal,
  valor_deuda,
  fecha_mandamiento,
  estado_proceso
) on table public.expedientes to anon;
grant select on table public.import_runs to anon;
grant select on table public.import_rejections to anon;
grant select on table public.expedientes_detalle to anon;
grant execute on function public.actualizar_expediente(
  text, text, text, text, text, smallint, bigint, date, text
) to anon;

create policy "Lectura pública de contribuyentes para la prueba"
on public.contribuyentes for select to anon using (true);

create policy "Edición pública controlada de contribuyentes para la prueba"
on public.contribuyentes for update to anon using (true) with check (true);

create policy "Lectura pública de expedientes para la prueba"
on public.expedientes for select to anon using (true);

create policy "Edición pública controlada de expedientes para la prueba"
on public.expedientes for update to anon using (true) with check (true);

create policy "Lectura pública de auditorías de importación"
on public.import_runs for select to anon using (true);

create policy "Lectura pública de rechazos sin datos crudos"
on public.import_rejections for select to anon using (true);

comment on table public.contribuyentes is
  'Identidad y datos de contacto normalizados por documento; evita repetir contribuyentes.';
comment on table public.expedientes is
  'Expedientes de cobro aceptados tras la depuración conservadora del archivo fuente.';
comment on table public.import_rejections is
  'Filas no cargadas y motivos auditables; no conserva el registro crudo completo.';
comment on view public.expedientes_detalle is
  'Vista de lectura para la aplicación; usa security_invoker y respeta RLS.';
