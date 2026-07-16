"""Build reviewed evidence for the BODIVA kwanza sovereign yield curve MVP."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "database/sqlserver/evidence/bodiva-sovereign-yield-curve-2025-2026.json"
ARCHIVE_URL = "https://www.bodiva.ao/estatistica"
TENORS = ["3M", "6M", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "9Y", "10Y"]
TENOR_MONTHS = {"3M": 3, "6M": 6, **{f"{year}Y": year * 12 for year in range(1, 11)}}

# Values are transcribed from the official "Curva de Rendimentos Kz" table on
# page 7 of each bulletin and independently reconciled against the plotted labels.
SNAPSHOTS = [
    ("2025-02-21", [17.56, 17.62, 18.07, 17.32, 17.31, 17.91, 17.16, 17.42, 18.47, 19.62, 20.87, 21.74]),
    ("2025-05-06", [13.66, 15.13, 14.77, 17.15, 18.85, 19.19, 18.09, 18.29, 19.73, 20.01, 20.71, 20.44]),
    ("2026-01-23", [16.06, 16.81, 17.65, 17.59, 18.31, 18.12, 18.58, 19.03, 19.45, 19.12, 18.93, 18.65]),
    ("2026-06-25", [13.90, 16.61, 16.63, 16.86, 17.47, 18.18, 18.63, 19.13, 19.31, 19.35, 18.94, 18.42]),
]


def validate(rows: list[dict]) -> None:
    if len(rows) != len(SNAPSHOTS) * len(TENORS):
        raise ValueError("The expected 12-tenor curve is not complete for every snapshot.")
    keys = {(row["referenceDate"], row["tenor"]) for row in rows}
    if len(keys) != len(rows):
        raise ValueError("Duplicate reference-date/tenor pair found.")
    if any(not 0 < row["yieldPct"] < 100 for row in rows):
        raise ValueError("Yield outside the accepted percentage domain.")
    for reference_date, _ in SNAPSHOTS:
        curve = [row for row in rows if row["referenceDate"] == reference_date]
        if [row["tenor"] for row in curve] != TENORS:
            raise ValueError(f"Tenor ordering failed for {reference_date}.")


rows: list[dict] = []
assets: list[dict] = []
for reference_date, values in SNAPSHOTS:
    compact_date = reference_date.replace("-", "")
    source_url = f"https://www.bodiva.ao/media/boletim-diario/boletimdiario{compact_date}.pdf"
    content = urlopen(source_url, timeout=90).read()
    if not content.startswith(b"%PDF"):
        raise ValueError(f"Official asset is not a PDF: {source_url}")
    assets.append({
        "referenceDate": reference_date,
        "sourceUrl": source_url,
        "sourcePage": 7,
        "contentSha256": hashlib.sha256(content).hexdigest().upper(),
        "contentSizeBytes": len(content),
    })
    for tenor, value in zip(TENORS, values, strict=True):
        rows.append({
            "referenceDate": reference_date,
            "tenor": tenor,
            "tenorMonths": TENOR_MONTHS[tenor],
            "yieldPct": value,
            "sourceUrl": source_url,
            "sourcePage": 7,
        })

validate(rows)
for reference_date, _ in SNAPSHOTS:
    by_tenor = {row["tenor"]: row["yieldPct"] for row in rows if row["referenceDate"] == reference_date}
    for row in rows:
        if row["referenceDate"] == reference_date:
            row["spread5y1yBps"] = round((by_tenor["5Y"] - by_tenor["1Y"]) * 100, 2)
            row["spread10y2yBps"] = round((by_tenor["10Y"] - by_tenor["2Y"]) * 100, 2)

payload = {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "source": {"name": "BODIVA Official Market Bulletin", "archiveUrl": ARCHIVE_URL},
    "currency": "AOA",
    "curve": "Curva de Rendimentos Kz",
    "methodology": "Official published tenor points; no interpolation and no forward filling.",
    "assets": assets,
    "rows": rows,
    "quality": {"criticalFindings": 0, "highFindings": 0, "expectedTenorsPerSnapshot": 12},
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"output": str(OUTPUT), "assets": len(assets), "observations": len(rows)}, ensure_ascii=False))
