# LAZA Subscription Access Matrix

> Created on 20 July 2026 for LAZA-044. This matrix defines the MVP-level
> segregation of data and feature access by subscription tier.

## Subscription personas

| Test user | Plan | Purpose |
| --- | --- | --- |
| `free-demo` | Free | Public discovery, current-period macro visibility and limited previews |
| `professional-demo` | Professional | Analyst workflow with histories, downloads and standard advanced intelligence |
| `enterprise-demo` | Enterprise | Institutional workflow with all products, premium capital-markets intelligence and API-ready access |

## Official indicators

| Indicator | Free | Professional | Enterprise |
| --- | --- | --- | --- |
| GDP Growth | Full | Full | Full |
| Inflation Rate / IPCN | Full | Full | Full |
| Exchange Rate AOA/USD | Full | Full | Full |
| Population | Full | Full | Full |
| Banking Assets | Preview | Full | Full |
| Public Debt/GDP | Preview | Full | Full |

## Advanced Market Intelligence

| Product | Free | Professional | Enterprise |
| --- | --- | --- | --- |
| Oil vs. Non-Oil GDP | Preview | Full | Full |
| Oil & Gas Production | Preview | Full | Full |
| Fiscal Execution | Preview | Full | Full |
| Sovereign Yield Curve | Locked | Preview | Full |

## Source downloads

| Dataset group | Free | Professional | Enterprise |
| --- | --- | --- | --- |
| INE IPCN | Preview | Full | Full |
| BNA Exchange Rate Reference | Preview | Full | Full |
| INE Quarterly GDP | Preview | Full | Full |
| INE Population Census | Preview | Full | Full |
| BNA Banking Assets | Locked | Full | Full |
| UGD Public Debt | Locked | Full | Full |
| ANPG Oil & Gas | Locked | Full | Full |
| MINFIN Fiscal Execution | Locked | Full | Full |
| INE Oil vs. Non-Oil GDP | Locked | Full | Full |
| BODIVA Sovereign Yield Curve | Locked | Preview | Full |

## MVP implementation boundary

The website now includes an Admin-only **Access Preview** tool and uses the
matrix above to show Included, Preview or Upgrade states in the public site:

- Official Indicators;
- Advanced Market Intelligence cards;
- Official Source Marketplace downloads.

The current implementation is intended for MVP validation and commercial
discussion. The public homepage does not expose a QA selector; administrators
choose the simulated profile inside the Admin Panel and open the public site as
that audience. Production-grade enforcement still requires identity integration,
server-side authorization, subscription lifecycle, billing state, expiry rules,
rate limits and audit logs.
