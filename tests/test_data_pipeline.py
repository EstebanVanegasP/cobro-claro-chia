import json
import unittest
from pathlib import Path

from scripts.transform_csv import normalize_name, only_digits, parse_date, parse_money


ROOT = Path(__file__).resolve().parents[1]


class NormalizationTests(unittest.TestCase):
    def test_money_formats_are_normalized_without_decimals(self):
        self.assertEqual(parse_money("$ 2.919.885,00"), 2_919_885)
        self.assertEqual(parse_money("3'350.756"), 3_350_756)
        self.assertEqual(parse_money("COP 1935037"), 1_935_037)
        self.assertIsNone(parse_money("N/A"))

    def test_date_formats_are_normalized_and_impossible_dates_rejected(self):
        self.assertEqual(parse_date("26/12/2020"), "2020-12-26")
        self.assertEqual(parse_date("19-jul-19"), "2019-07-19")
        self.assertEqual(parse_date("2024-06-02"), "2024-06-02")
        self.assertIsNone(parse_date("31/02/2021"))

    def test_identity_fields_keep_information(self):
        self.assertEqual(only_digits("C.C. 79.845.112"), "79845112")
        self.assertEqual(normalize_name("  comercializadora   el progreso sas "), "Comercializadora El Progreso SAS")


class ProcessedDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads((ROOT / "data/processed/expedientes.json").read_text(encoding="utf-8"))
        cls.rejections = json.loads((ROOT / "data/processed/rejections.json").read_text(encoding="utf-8"))
        cls.summary = json.loads((ROOT / "data/processed/summary.json").read_text(encoding="utf-8"))

    def test_import_balance_is_reconciled(self):
        self.assertEqual(self.summary["source_rows"], len(self.rows) + len(self.rejections))
        self.assertEqual(self.summary["accepted_rows"], 247)
        self.assertEqual(self.summary["rejected_rows"], 33)

    def test_accepted_grain_is_unique_and_valid(self):
        identifiers = [row["id_expediente"] for row in self.rows]
        self.assertEqual(len(identifiers), len(set(identifiers)))
        self.assertTrue(all(row["valor_deuda"] > 0 for row in self.rows))
        self.assertTrue(all(1900 <= row["vigencia_fiscal"] <= 2026 for row in self.rows))
        self.assertTrue(all(7 <= len(row["documento"]) <= 12 for row in self.rows))


if __name__ == "__main__":
    unittest.main()
