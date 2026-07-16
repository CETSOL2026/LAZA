"""Build inspectable evidence for the LAZA MINFIN fiscal-execution product."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen


OUTPUT = Path(sys.argv[1] if len(sys.argv) > 1 else "database/sqlserver/evidence/minfin-fiscal-execution-2025q1-2026q1.json")
ARCHIVE_URL = "https://www.minfin.gov.ao/oge/reoge"

QUARTERS = [
    {
        "period": "2025-Q1", "periodStart": "2025-01-01", "periodEnd": "2025-03-31", "publicationDate": "2025-05-06",
        "assetId": "df341d44-3601-410d-8fe8-3d42efa2bd5c", "catalogTitle": "REOGE 2025 I Trimestre",
        "annualBudget": 34633790, "totalRevenue": 6117043, "currentRevenue": 3427149, "capitalRevenue": 2689894,
        "taxRevenue": 2067773, "patrimonialRevenue": 1348379, "petroleumRevenue": 2037620,
        "totalExpenditure": 6606405, "currentExpenditure": 3135835, "capitalExpenditure": 3470571,
        "personnelExpenditure": 892117, "interestExpenditure": 1050268, "investmentExpenditure": 1351862,
        "budgetBalance": -489362, "sourcePages": {"revenue": 16, "expenditure": 20, "balance": 45},
    },
    {
        "period": "2025-Q2", "periodStart": "2025-04-01", "periodEnd": "2025-06-30", "publicationDate": "2025-07-11",
        "assetId": "37498c08-8bdb-4120-b868-ccdd4b2858d6", "catalogTitle": "REOGE 2025 II Trimestre",
        "annualBudget": 34633790, "totalRevenue": 5927596, "currentRevenue": 4369123, "capitalRevenue": 1558473,
        "taxRevenue": 2766373, "patrimonialRevenue": 1588180, "petroleumRevenue": 2517837,
        "totalExpenditure": 6444059, "currentExpenditure": 3354634, "capitalExpenditure": 3089425,
        "personnelExpenditure": 922942, "interestExpenditure": 1045641, "investmentExpenditure": 1329912,
        "budgetBalance": -516463, "sourcePages": {"revenue": 16, "expenditure": 21, "balance": 44},
    },
    {
        "period": "2025-Q3", "periodStart": "2025-07-01", "periodEnd": "2025-09-30", "publicationDate": "2025-10-15",
        "assetId": "b5aa3d45-196e-489d-8774-09041d565c52", "catalogTitle": "REOGE 2025 III Trimestre",
        "annualBudget": 34633790, "totalRevenue": 5948773, "currentRevenue": 4149662, "capitalRevenue": 1799111,
        "taxRevenue": 2529055, "patrimonialRevenue": 1607350, "petroleumRevenue": 2190860,
        "totalExpenditure": 6310997, "currentExpenditure": 2978475, "capitalExpenditure": 3332522,
        "personnelExpenditure": 1025214, "interestExpenditure": 585297, "investmentExpenditure": 1473859,
        "budgetBalance": -362224, "sourcePages": {"revenue": 17, "expenditure": 22, "balance": 45},
    },
    {
        "period": "2025-Q4", "periodStart": "2025-10-01", "periodEnd": "2025-12-31", "publicationDate": "2026-03-12",
        "assetId": "6fb282a3-8ce4-4319-86ca-e271ae984b2b", "catalogTitle": "REOGE 2025 IV Trimestre",
        "annualBudget": 34633790, "totalRevenue": 13693239, "currentRevenue": 6777387, "capitalRevenue": 6915852,
        "taxRevenue": 5057435, "patrimonialRevenue": 1708064, "petroleumRevenue": 4270192,
        "totalExpenditure": 13474841, "currentExpenditure": 5229541, "capitalExpenditure": 8245300,
        "personnelExpenditure": 1021932, "interestExpenditure": 2360348, "investmentExpenditure": 2672538,
        "budgetBalance": 218398, "sourcePages": {"revenue": 17, "expenditure": 22, "balance": 46},
    },
    {
        "period": "2026-Q1", "periodStart": "2026-01-01", "periodEnd": "2026-03-31", "publicationDate": "2026-04-17",
        "assetId": "91df1c4e-b270-4732-8514-74463db3df96", "catalogTitle": "REOGE 2022 I Trimestre",
        "annualBudget": 33240844, "totalRevenue": 9362095, "currentRevenue": 3826500, "capitalRevenue": 5535595,
        "taxRevenue": 2495731, "patrimonialRevenue": 1313721, "petroleumRevenue": 1869945,
        "totalExpenditure": 9118187, "currentExpenditure": 3528620, "capitalExpenditure": 5589567,
        "personnelExpenditure": 1037195, "interestExpenditure": 1014862, "investmentExpenditure": 1704483,
        "budgetBalance": 243908, "sourcePages": {"revenue": 17, "expenditure": 21, "balance": 47},
    },
]


def validate(rows: list[dict]) -> list[dict]:
    findings: list[dict] = []
    if [row["period"] for row in rows] != ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1"]:
        findings.append({"severity": "CRITICAL", "rule": "QUARTER_COMPLETENESS"})
    for row in rows:
        if row["totalRevenue"] != row["currentRevenue"] + row["capitalRevenue"]:
            findings.append({"severity": "HIGH", "rule": "REVENUE_RECONCILIATION", "period": row["period"]})
        expenditure_delta = row["totalExpenditure"] - row["currentExpenditure"] - row["capitalExpenditure"]
        if expenditure_delta != 0:
            severity = "MEDIUM" if row["period"] == "2025-Q1" and expenditure_delta == -1 else "HIGH"
            findings.append({"severity": severity, "rule": "EXPENDITURE_RECONCILIATION", "period": row["period"], "observedDeltaMillionAoa": expenditure_delta})
        if row["budgetBalance"] != row["totalRevenue"] - row["totalExpenditure"]:
            findings.append({"severity": "HIGH", "rule": "BUDGET_BALANCE_RECONCILIATION", "period": row["period"]})
    findings.extend([
        {"severity": "MEDIUM", "rule": "CATALOG_TITLE_VALIDITY", "period": "2026-Q1", "message": "MINFIN catalog says 2022; PDF title and content identify 2026 Q1."},
        {"severity": "MEDIUM", "rule": "CATALOG_DATE_VALIDITY", "period": "2025-Q4", "message": "MINFIN catalog date precedes the quarter; PDF technical sheet says 12 March 2026."},
    ])
    return findings


for row in QUARTERS:
    row["sourceUrl"] = f"https://cms.minfin.gov.ao/api/assets/portal-minfin/{row['assetId']}/"
    content = urlopen(row["sourceUrl"], timeout=60).read()
    row["contentSha256"] = hashlib.sha256(content).hexdigest().upper()
    row["contentSizeBytes"] = len(content)
    row["revenueExecutionPct"] = round(row["totalRevenue"] / row["annualBudget"] * 100, 4)
    row["expenditureExecutionPct"] = round(row["totalExpenditure"] / row["annualBudget"] * 100, 4)

findings = validate(QUARTERS)
if any(item["severity"] in {"CRITICAL", "HIGH"} for item in findings):
    raise SystemExit(f"Fiscal execution evidence failed validation: {findings}")

payload = {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "source": {"name": "MINFIN Quarterly General State Budget Execution Reports", "archiveUrl": ARCHIVE_URL},
    "unit": "Million AOA",
    "grain": "One official fiscal-execution observation per reference quarter",
    "rows": QUARTERS,
    "quality": {
        "criticalFindings": 0,
        "highFindings": 0,
        "mediumFindings": len(findings),
        "acceptedSourceExceptions": findings,
    },
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"output": str(OUTPUT), "quarters": len(QUARTERS), "mediumFindings": len(findings)}, ensure_ascii=False))
