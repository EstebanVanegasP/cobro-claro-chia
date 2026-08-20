import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const [rows, rejections, summary] = await Promise.all([
  readJson("data/processed/expedientes.json"),
  readJson("data/processed/rejections.json"),
  readJson("data/processed/summary.json"),
]);

assert.equal(summary.source_rows, rows.length + rejections.length, "El balance de importación no cierra");
assert.equal(rows.length, 247, "Cambió inesperadamente el total aceptado");
assert.equal(rejections.length, 33, "Cambió inesperadamente el total rechazado");
assert.equal(new Set(rows.map((row) => row.id_expediente)).size, rows.length, "Hay identificadores duplicados");
assert.ok(rows.every((row) => row.valor_deuda > 0), "Hay deudas no positivas");
assert.ok(rows.every((row) => row.vigencia_fiscal >= 1900 && row.vigencia_fiscal <= 2026), "Hay vigencias inválidas");
assert.ok(rows.every((row) => /^\d{7,12}$/.test(row.documento)), "Hay documentos sin normalizar");

console.log(`OK: ${rows.length} aceptados + ${rejections.length} rechazados = ${summary.source_rows} filas auditadas.`);
