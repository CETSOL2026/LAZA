# INE Angola IPCN - acquisition quality assessment

Assessment date: 2026-07-16

## Dataset and grain

The latest official publication is the National Consumer Price Index (IPCN) for
June 2026, published by INE Angola on 2026-07-08. The target Silver grain is one
national observation per month and measure:

- IPCN index level, base December 2020 = 100;
- year-over-year percentage change.

The publication table covers January 2021 through June 2026: 66 monthly periods
and two measures, or 132 candidate long-form observations. The separate
"annual average" row is a rolling 12-month geometric average and must not be
loaded at the monthly observation grain.

## Checks performed

| Check | Evidence | Result |
| --- | --- | --- |
| Official provenance | Publication page and assets are under `ine.gov.ao` | PASS |
| File signatures | PDFs start with `%PDF-1.7`; XLSX starts with ZIP `PK` signature | PASS |
| Content hashes | SHA-256 captured for all three assets | PASS |
| PDF readability | 3-page publication and 5-page methodology are unencrypted | PASS |
| Visual inspection | Publication pages render legibly; page 3 table is complete | PASS |
| Latest value consistency | Headline 10.11% equals June 2026 table value | PASS |
| Formula reconciliation | `(264.79 / 240.47 - 1) * 100` rounds to 10.11% | PASS |
| Current structured file | No Excel link is exposed for June 2026 | WARNING |
| April workbook inspection | Artifact-tool runtime unavailable in this session | BLOCKED |

## Findings

### High - generic PDF extraction is unsafe

The visual table is correct, but its merged headers cause a generic table
extractor to collapse several yearly values into individual cells. Loading that
raw extractor output would risk shifted years and incorrect measures.

Mitigation: use a deterministic month/year mapping, validate 66 unique periods,
and reconcile June 2026 to index 264.79 and YoY 10.11 before Silver publication.

### Medium - latest structured source lags two months

The portal exposes an official Excel for April 2026, while May and June expose
PDF and methodology only. The workbook is useful as a structural reference but
cannot by itself provide the June value.

Mitigation: use the April workbook for mapping validation once the approved
spreadsheet runtime is available; obtain May and June from their official PDFs
and apply cross-period reconciliation.

### Medium - annual-average row has a different grain

The row labelled annual average is defined as the geometric average of the last
12 months. Treating it as another monthly observation would mix grains.

Mitigation: exclude it from the first monthly series or define a separate
indicator series and methodology.

## Readiness decision

The acquired assets and normalized extraction are trustworthy enough for
**official Gold publication**. The 66-month extraction, uniqueness,
completeness and available homologue reconciliations were executed. The
unavailable 2020 comparisons were accepted as explicit DQ exceptions without
erasing the original warnings. All observations received separate official
approval before publication.

## Required Silver checks

1. Exactly 66 unique month/year keys from 2021-01 through 2026-06.
2. Exactly one index and one YoY value per expected month.
3. Decimal-comma normalization without changing precision.
4. Index values strictly positive.
5. YoY reconciliation against the index and the value from 12 months earlier.
6. June 2026 acceptance anchors: index 264.79 and YoY 10.11%.
7. Separate handling of the rolling 12-month average row.

## Bronze ingestion result

The first controlled load completed successfully on 2026-07-16:

| Check | Result |
| --- | --- |
| Pipeline run | `2`, `SUCCEEDED` |
| Ingestion batch | `2`, `INE-IPCN-2026-06-20260716-V1` |
| Classification | `OFFICIAL` |
| Batch status | `LOADED` |
| Source assets | 3 loaded and archived |
| Raw observations | 1 accepted headline observation |
| Silver writes | 0 |
| Gold official writes | 0 |
| Existing Gold DEMO rows | 6, unchanged |
| Validation violations | 0 |

The methodology asset remains non-official at database level because its exact
publication date is not exposed. Its official-domain URL, source version, file
hash and document creation metadata remain recorded without inventing a
publication date.

## Silver normalization result

The controlled Silver transformation completed successfully on 2026-07-16:

| Check | Result |
| --- | --- |
| Pipeline run | `3`, `SUCCEEDED` |
| Indicator series | `INFLATION_RATE_AGO_INE_IPCN_YOY`, series `7` |
| Monthly range | 2021-01 through 2026-06 |
| Silver observations | 66 |
| Unique periods | 66 |
| Missing periods | 0 |
| Completeness results | 66 PASS |
| Uniqueness results | 66 PASS |
| Homologue reconciliation | 54 PASS, 12 WARN, 0 FAIL |
| Maximum absolute difference | 0.01 percentage point |
| Total DQ results | 198: 186 PASS, 12 WARN, 0 FAIL |
| Gold official writes | 0 |

The 12 warnings correspond exactly to January through December 2021. The
publication table begins in January 2021, so those periods lack the t-12 index
needed for independent recalculation. They remain traceable in Silver with a
quality score of 83.33; the other 54 observations scored 100.00.

## Accepted reconciliation limitation

The project decision to proceed without nonexistent 2020 index levels was
recorded on 2026-07-16 through pipeline run `4`:

| Governance check | Result |
| --- | --- |
| Approved DQ exceptions | 12 |
| Affected range | 2021-01 through 2021-12 |
| Original reconciliation evidence | 54 PASS and 12 WARN, preserved |
| Silver observations released | 12 |
| Silver observations now PASSED | 66 of 66 |
| Official publication approvals | 0 |
| Gold official writes | 0 |

This acceptance means the 2021 rates may continue through the controlled
pipeline based on official published values, completeness, uniqueness and exact
source lineage. It does not claim that a t-12 recalculation was performed and
does not itself authorize official Gold publication.

## Official Gold publication result

The controlled publication completed successfully on 2026-07-16 through
pipeline run `5`:

| Publication check | Result |
| --- | --- |
| Official approvals | 66 |
| Silver observations marked PUBLISHED | 66 |
| Gold official facts | 66 |
| Unique Gold months | 66 |
| Gold range | 2021-01 through 2026-06 |
| Broken source-evidence links | 0 |
| Quality-score range | 83.33 to 100.00 |
| Latest API value | 2026-06, 10.11%, PUBLISHED, official |
| Existing DEMO facts | 6, unchanged |

Overall validation assessment: **Ready to share with the documented 2021
reconciliation caveat**. The Gold facts preserve the lower 83.33 score for the
12 accepted exceptions, while all other monthly observations score 100.00.
