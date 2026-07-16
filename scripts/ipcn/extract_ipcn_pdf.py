"""Extract and reconcile one monthly IPCN row from the official PDF table."""

from __future__ import annotations

import argparse
import json
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from pypdf import PdfReader


MONTH_PATTERNS = {
    1: r"Janeiro",
    2: r"Fevereiro",
    3: r"Mar.o",
    4: r"Abril",
    5: r"Maio",
    6: r"Junho",
    7: r"Julho",
    8: r"Agosto",
    9: r"Setembro",
    10: r"Outubro",
    11: r"Novembro",
    12: r"Dezembro",
}


def decimal_from_pt(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def extract(pdf_path: Path, reference_period: str) -> dict:
    year, month = (int(part) for part in reference_period.split("-"))
    pages = [page.extract_text() or "" for page in PdfReader(str(pdf_path)).pages]
    table_page_index = next(
        (index for index, text in enumerate(pages) if "Base: Dez. 2020 = 100" in text and "Janeiro" in text),
        None,
    )
    if table_page_index is None:
        raise ValueError("IPCN base table was not found in the PDF.")

    table_text = pages[table_page_index]
    header_line = max(
        table_text.splitlines(),
        key=lambda line: len(re.findall(r"\b20\d{2}\b", line)),
    )
    header_years = [int(value) for value in re.findall(r"\b20\d{2}\b", header_line)]
    years = sorted(set(header_years))
    if len(years) < 2 or year not in years:
        raise ValueError(f"Reference year {year} was not found in the IPCN table header.")

    month_pattern = MONTH_PATTERNS[month]
    row_line = next(
        (line for line in table_text.splitlines() if re.match(rf"^\s*{month_pattern}\b", line, re.IGNORECASE)),
        None,
    )
    if row_line is None:
        raise ValueError(f"Month {month:02d} was not found in the IPCN table.")

    numeric_tokens = re.findall(r"(?<!\d)-?\d+(?:[.,]\d+)?", re.sub(rf"^\s*{month_pattern}\s+", "", row_line, flags=re.IGNORECASE))
    values = [decimal_from_pt(token) for token in numeric_tokens]
    year_position = years.index(year)
    expected_values = 2 * len(years)
    if len(values) < expected_values:
        raise ValueError(
            f"The {reference_period} row has {len(values)} numeric values; expected {expected_values}."
        )

    index_value = values[year_position]
    prior_index_value = values[year_position - 1]
    reported_yoy = values[len(years) + year_position]
    calculated_yoy = (((index_value / prior_index_value) - Decimal("1")) * Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    absolute_difference = abs(reported_yoy - calculated_yoy)

    all_text = "\n".join(pages)
    headline_match = re.search(r"registou uma varia.{0,40}?(\d+[.,]\d+)\s*%", all_text, re.IGNORECASE | re.DOTALL)
    headline_yoy = decimal_from_pt(headline_match.group(1)) if headline_match else None
    if headline_yoy is not None and headline_yoy != reported_yoy:
        raise ValueError(f"Headline YoY {headline_yoy} does not match table YoY {reported_yoy}.")

    return {
        "referencePeriod": reference_period,
        "referenceYear": year,
        "referenceMonth": month,
        "indexValue": float(index_value),
        "priorYearIndexValue": float(prior_index_value),
        "reportedYoyPercent": float(reported_yoy),
        "calculatedYoyPercent": float(calculated_yoy),
        "absoluteDifferencePercentagePoints": float(absolute_difference),
        "headlineYoyPercent": float(headline_yoy) if headline_yoy is not None else None,
        "sourcePage": table_page_index + 1,
        "tableYears": years,
        "reconciliationStatus": "PASS" if absolute_difference <= Decimal("0.01") else "FAIL",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--period", required=True, help="Reference period in YYYY-MM format")
    args = parser.parse_args()
    print(json.dumps(extract(args.pdf, args.period), ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
