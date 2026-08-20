"""Perfil reproducible del CSV entregado para la prueba tecnica LIGIIC."""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path


DATE_FORMATS = (
    "%d/%m/%Y",
    "%Y-%m-%d",
    "%d-%b-%y",
    "%d-%b-%Y",
    "%d/%m/%y",
)


def clean_space(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def key(value: str | None) -> str:
    text = clean_space(value).lower()
    return "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )


def digits(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def parse_money(value: str | None) -> int | None:
    raw = clean_space(value)
    if not raw:
        return None
    normalized = re.sub(r"(?i)cop|\$|\s|[.']", "", raw)
    normalized = normalized.replace(",", ".")
    try:
        amount = Decimal(normalized)
    except InvalidOperation:
        return None
    if amount != amount.to_integral_value():
        return None
    return int(amount)


def parse_date(value: str | None) -> str | None:
    raw = clean_space(value).lower()
    month_map = {
        "ene": "Jan",
        "abr": "Apr",
        "ago": "Aug",
        "dic": "Dec",
    }
    for spanish, english in month_map.items():
        raw = re.sub(rf"(?<=-){spanish}(?=-)", english, raw)
    for date_format in DATE_FORMATS:
        try:
            return datetime.strptime(raw, date_format).date().isoformat()
        except ValueError:
            continue
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    with args.csv_path.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))

    columns = list(rows[0]) if rows else []
    missing = {column: sum(not clean_space(row[column]) for row in rows) for column in columns}
    exact_ids = Counter(clean_space(row["id_expediente"]) for row in rows)
    normalized_docs = Counter(digits(row["documento"]) for row in rows)
    names_by_doc: dict[str, set[str]] = defaultdict(set)
    docs_by_name: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        document = digits(row["documento"])
        name = key(row["nombre_contribuyente"])
        names_by_doc[document].add(name)
        docs_by_name[name].add(document)

    parsed_money = [parse_money(row["valor_deuda"]) for row in rows]
    parsed_dates = [parse_date(row["fecha_mandamiento"]) for row in rows]
    years = []
    for row in rows:
        try:
            years.append(int(clean_space(row["vigencia_fiscal"])))
        except ValueError:
            pass

    report = {
        "source": str(args.csv_path.resolve()),
        "grain_assumption": "una fila por id_expediente",
        "row_count": len(rows),
        "column_count": len(columns),
        "columns": columns,
        "missing_counts": missing,
        "exact_duplicate_rows": len(rows) - len({tuple(row[column] for column in columns) for row in rows}),
        "duplicate_id_values": {item: count for item, count in exact_ids.items() if count > 1},
        "document_length_counts": dict(sorted(Counter(len(digits(row["documento"])) for row in rows).items())),
        "invalid_documents": [
            {"row": index, "value": row["documento"]}
            for index, row in enumerate(rows, 2)
            if not 7 <= len(digits(row["documento"])) <= 12
        ],
        "documents_with_multiple_names": {
            document: sorted(names)
            for document, names in names_by_doc.items()
            if document and len(names) > 1
        },
        "names_with_multiple_documents": {
            name: sorted(documents)
            for name, documents in docs_by_name.items()
            if name and len(documents) > 1
        },
        "tax_raw_values": dict(Counter(clean_space(row["tipo_impuesto"]) for row in rows)),
        "tax_normalized_keys": dict(Counter(key(row["tipo_impuesto"]) for row in rows)),
        "status_raw_values": dict(Counter(clean_space(row["estado_proceso"]) for row in rows)),
        "status_normalized_keys": dict(Counter(key(row["estado_proceso"]) for row in rows)),
        "fiscal_year_min": min(years) if years else None,
        "fiscal_year_max": max(years) if years else None,
        "invalid_fiscal_year_rows": [
            {"row": index, "value": row["vigencia_fiscal"]}
            for index, row in enumerate(rows, 2)
            if not clean_space(row["vigencia_fiscal"]).isdigit()
            or not 2000 <= int(clean_space(row["vigencia_fiscal"])) <= 2026
        ],
        "money_raw_format_samples": dict(Counter(clean_space(row["valor_deuda"]) for row in rows).most_common(12)),
        "invalid_money_rows": [
            {"row": index, "value": row["valor_deuda"]}
            for index, (row, amount) in enumerate(zip(rows, parsed_money), 2)
            if amount is None or amount <= 0
        ],
        "debt_min": min((amount for amount in parsed_money if amount is not None), default=None),
        "debt_max": max((amount for amount in parsed_money if amount is not None), default=None),
        "invalid_date_rows": [
            {"row": index, "value": row["fecha_mandamiento"]}
            for index, (row, parsed) in enumerate(zip(rows, parsed_dates), 2)
            if parsed is None
        ],
        "date_format_counts": dict(Counter(
            "iso" if re.fullmatch(r"\d{4}-\d{2}-\d{2}", clean_space(row["fecha_mandamiento"]))
            else "slash" if "/" in clean_space(row["fecha_mandamiento"])
            else "month_name" if re.search(r"[A-Za-z]", clean_space(row["fecha_mandamiento"]))
            else "other"
            for row in rows
        )),
        "phone_length_counts": dict(sorted(Counter(
            len(digits(row["telefono"])) if digits(row["telefono"]) else 0 for row in rows
        ).items())),
        "invalid_phone_rows": [
            {"row": index, "value": row["telefono"]}
            for index, row in enumerate(rows, 2)
            if digits(row["telefono"]) and not 7 <= len(digits(row["telefono"])) <= 10
        ],
    }

    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
