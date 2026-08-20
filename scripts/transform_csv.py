"""Normaliza el CSV y genera artefactos auditables para Supabase.

La politica es conservadora: un expediente ambiguo o con un campo juridicamente
relevante invalido no se adivina; se envia al registro de rechazos.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


CURRENT_YEAR = 2026
DATE_FORMATS = ("%d/%m/%Y", "%Y-%m-%d", "%d-%b-%y", "%d-%b-%Y", "%d/%m/%y")
TAXES = {
    "predial": "Predial unificado",
    "predial unificado": "Predial unificado",
    "ica": "Industria y comercio",
    "industria y comercio": "Industria y comercio",
    "vehiculos": "Vehículos automotores",
    "vehiculos automotores": "Vehículos automotores",
}
STATUSES = {
    "persuasivo": "Persuasivo",
    "coactivo": "Coactivo",
    "archivado": "Archivado",
    "cerrado": "Cerrado",
}


def clean_space(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def normalized_key(value: str | None) -> str:
    text = clean_space(value).lower()
    return "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )


def only_digits(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def normalize_name(value: str | None) -> str:
    titled = clean_space(value).lower().title()
    return re.sub(r"\b(Sas|Ltda)\b", lambda match: match.group(1).upper(), titled)


def parse_money(value: str | None) -> int | None:
    raw = clean_space(value)
    if not raw:
        return None
    normalized = re.sub(r"(?i)cop|\$|\s|[.']", "", raw).replace(",", ".")
    try:
        amount = Decimal(normalized)
    except InvalidOperation:
        return None
    if amount != amount.to_integral_value():
        return None
    return int(amount)


def parse_date(value: str | None) -> str | None:
    raw = clean_space(value).lower()
    month_map = {"ene": "Jan", "abr": "Apr", "ago": "Aug", "dic": "Dec"}
    for spanish, english in month_map.items():
        raw = re.sub(rf"(?<=-){spanish}(?=-)", english, raw)
    for date_format in DATE_FORMATS:
        try:
            return datetime.strptime(raw, date_format).date().isoformat()
        except ValueError:
            continue
    return None


def preliminary(row: dict[str, str]) -> dict[str, Any]:
    status_key = normalized_key(row["estado_proceso"])
    return {
        "id_expediente": clean_space(row["id_expediente"]).upper(),
        "documento": only_digits(row["documento"]),
        "nombre_contribuyente": normalize_name(row["nombre_contribuyente"]),
        "tipo_impuesto": TAXES.get(normalized_key(row["tipo_impuesto"])),
        "vigencia_fiscal": int(clean_space(row["vigencia_fiscal"]))
        if clean_space(row["vigencia_fiscal"]).isdigit()
        else None,
        "valor_deuda": parse_money(row["valor_deuda"]),
        "fecha_mandamiento": parse_date(row["fecha_mandamiento"]),
        "estado_proceso": STATUSES.get(status_key, "Sin definir" if not status_key else None),
        "direccion_notificacion": clean_space(row["direccion_notificacion"]) or None,
        "telefono": only_digits(row["telefono"]) or None,
    }


def validate(item: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    if not item["id_expediente"] or len(item["id_expediente"]) > 40:
        reasons.append("Identificador ausente o demasiado largo")
    if not 7 <= len(item["documento"]) <= 12:
        reasons.append("Documento ausente o con longitud inválida")
    if not item["nombre_contribuyente"]:
        reasons.append("Nombre del contribuyente ausente")
    if item["tipo_impuesto"] is None:
        reasons.append("Tipo de impuesto no reconocido")
    if item["vigencia_fiscal"] is None or not 1900 <= item["vigencia_fiscal"] <= CURRENT_YEAR:
        reasons.append("Vigencia fiscal inválida o futura")
    if item["valor_deuda"] is None or item["valor_deuda"] <= 0:
        reasons.append("Valor de deuda ausente, no numérico o no positivo")
    if item["fecha_mandamiento"] is None:
        reasons.append("Fecha de mandamiento ausente o imposible")
    if item["estado_proceso"] is None:
        reasons.append("Estado del proceso no reconocido")
    return reasons


def sql_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, dict)):
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        return "'" + encoded.replace("'", "''") + "'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


def render_insert(table: str, columns: list[str], rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    values = [
        "(" + ", ".join(sql_literal(row[column]) for column in columns) + ")"
        for row in rows
    ]
    return (
        f"insert into public.{table} ({', '.join(columns)}) values\n  "
        + ",\n  ".join(values)
        + ";\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed"))
    parser.add_argument("--seed", type=Path, default=Path("supabase/seed.sql"))
    args = parser.parse_args()

    with args.csv_path.open("r", encoding="utf-8-sig", newline="") as stream:
        source_rows = list(csv.DictReader(stream))

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for source_row, raw in enumerate(source_rows, start=2):
        item = preliminary(raw)
        grouped[item["id_expediente"]].append(
            {"source_row": source_row, "raw": raw, "item": item}
        )

    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for identifier, group in grouped.items():
        canonical_versions = {
            json.dumps(entry["item"], ensure_ascii=False, sort_keys=True) for entry in group
        }
        if len(group) > 1 and len(canonical_versions) > 1:
            for entry in group:
                rejected.append(
                    {
                        "source_row": entry["source_row"],
                        "id_expediente": identifier,
                        "reasons": ["Identificador duplicado con datos contradictorios"],
                    }
                )
            continue

        first = group[0]
        reasons = validate(first["item"])
        if reasons:
            rejected.append(
                {
                    "source_row": first["source_row"],
                    "id_expediente": identifier,
                    "reasons": reasons,
                }
            )
        else:
            item = dict(first["item"])
            item["source_row"] = first["source_row"]
            item["quality_status"] = "Observación" if item["estado_proceso"] == "Sin definir" else "Válido"
            item["quality_notes"] = (
                ["Estado vacío en la fuente; se conserva como Sin definir"]
                if item["estado_proceso"] == "Sin definir"
                else []
            )
            accepted.append(item)

        for duplicate in group[1:]:
            rejected.append(
                {
                    "source_row": duplicate["source_row"],
                    "id_expediente": identifier,
                    "reasons": ["Fila duplicada exacta; se conservó la primera aparición"],
                }
            )

    accepted.sort(key=lambda row: row["id_expediente"])
    rejected.sort(key=lambda row: row["source_row"])

    contributors: dict[str, dict[str, Any]] = {}
    for row in accepted:
        contributors.setdefault(
            row["documento"],
            {
                "documento": row["documento"],
                "nombre": row["nombre_contribuyente"],
                "direccion_notificacion": row["direccion_notificacion"],
                "telefono": row["telefono"],
            },
        )

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    summary = {
        "generated_at": generated_at,
        "source_rows": len(source_rows),
        "accepted_rows": len(accepted),
        "rejected_rows": len(rejected),
        "flagged_rows": sum(row["quality_status"] == "Observación" for row in accepted),
        "contributors": len(contributors),
        "debt_total": sum(row["valor_deuda"] for row in accepted),
        "missing_optional": {
            "direccion_notificacion": sum(row["direccion_notificacion"] is None for row in accepted),
            "telefono": sum(row["telefono"] is None for row in accepted),
        },
        "rejection_reason_counts": {
            reason: sum(reason in row["reasons"] for row in rejected)
            for reason in sorted({reason for row in rejected for reason in row["reasons"]})
        },
    }

    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "expedientes.json").write_text(
        json.dumps(accepted, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.output_dir / "rejections.json").write_text(
        json.dumps(rejected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.output_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    contributor_rows = list(contributors.values())
    expediente_rows = [
        {
            "id_expediente": row["id_expediente"],
            "documento_contribuyente": row["documento"],
            "tipo_impuesto": row["tipo_impuesto"],
            "vigencia_fiscal": row["vigencia_fiscal"],
            "valor_deuda": row["valor_deuda"],
            "fecha_mandamiento": row["fecha_mandamiento"],
            "estado_proceso": row["estado_proceso"],
            "quality_status": row["quality_status"],
            "quality_notes": row["quality_notes"],
            "source_row": row["source_row"],
        }
        for row in accepted
    ]
    rejection_rows = [
        {
            "source_row": row["source_row"],
            "id_expediente": row["id_expediente"],
            "reasons": row["reasons"],
        }
        for row in rejected
    ]

    seed = "-- Generado por scripts/transform_csv.py. No editar manualmente.\n\n"
    seed += "truncate table public.import_rejections, public.expedientes, public.contribuyentes, public.import_runs restart identity cascade;\n\n"
    seed += render_insert(
        "contribuyentes",
        ["documento", "nombre", "direccion_notificacion", "telefono"],
        contributor_rows,
    )
    seed += "\n"
    seed += render_insert(
        "expedientes",
        [
            "id_expediente",
            "documento_contribuyente",
            "tipo_impuesto",
            "vigencia_fiscal",
            "valor_deuda",
            "fecha_mandamiento",
            "estado_proceso",
            "quality_status",
            "quality_notes",
            "source_row",
        ],
        expediente_rows,
    )
    seed += "\n"
    seed += render_insert(
        "import_rejections", ["source_row", "id_expediente", "reasons"], rejection_rows
    )
    seed += "\n"
    seed += render_insert(
        "import_runs",
        [
            "source_file",
            "source_rows",
            "accepted_rows",
            "rejected_rows",
            "flagged_rows",
            "summary",
        ],
        [
            {
                "source_file": args.csv_path.name,
                "source_rows": summary["source_rows"],
                "accepted_rows": summary["accepted_rows"],
                "rejected_rows": summary["rejected_rows"],
                "flagged_rows": summary["flagged_rows"],
                "summary": summary,
            }
        ],
    )
    args.seed.parent.mkdir(parents=True, exist_ok=True)
    args.seed.write_text(seed, encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
