# LAZA SQL Server POC - approval checklist

No SQL object should be created until every required item below has an explicit
decision.

| Item | Proposed decision | Status |
| --- | --- | --- |
| Target instance | `.\SQLEXPRESS` | Applied 2026-07-16 |
| Database name | `LAZA_DATA_PLATFORM_DEV` | Applied 2026-07-16 |
| Recovery model | `SIMPLE` | Applied 2026-07-16 |
| MDF/LDF location | SQL Server instance default directory | Applied 2026-07-16 |
| Raw landing location | External folder, to be defined | Pending operational definition |
| Layer schemas | `control`, `audit`, `reference`, `bronze`, `silver`, `dq`, `gold`, `api` | Applied 2026-07-16 |
| Initial data | Six non-official demo observations | Applied 2026-07-16 |
| Demo Gold publication | Allowed only as `DEMONSTRATION`, `is_official = 0` | Applied and validated |
| Database roles | Create empty roles; assign no users yet | Applied; zero members |
| Scheduler | Select Windows Task Scheduler, Python, PowerShell or Alteryx | Pending operational decision |
| Backup before deployment | Not applicable to a new database; define post-create backup | Initial post-create baseline completed and verified 2026-07-16 |
| Rollback authority | Explicit approval required before running script 99 | Pending definition |

## Required acceptance statements

- [x] I approve creating the isolated `LAZA_DATA_PLATFORM_DEV` database.
- [x] I approve the proposed schemas and table grains.
- [x] I understand that the initial six values are demonstration data.
- [x] I approve loading DEMO observations into Gold with `is_official = 0`.
- [x] I approve creating empty database roles without assigning users.
- [ ] I approve the selected landing-folder and orchestration approach.
- [x] I approve executing scripts 00-09 in the documented order.

Script `99_rollback.sql` is excluded from normal deployment approval and always
requires a separate explicit confirmation.
