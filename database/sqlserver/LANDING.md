# LAZA external landing area

Created on 2026-07-16 for the first official-source pipeline.

## Local root

`D:\LAZA_DATA`

This location is outside SQL Server and outside the Git repository. Raw source
files must not be stored as database BLOBs or committed to Git.

## Directory contract

```text
D:\LAZA_DATA
|-- landing
|   |-- ine\inflation
|   `-- bna\exchange-rate
|-- archive
|   |-- ine\inflation
|   `-- bna\exchange-rate
|-- rejected
|   |-- ine\inflation
|   `-- bna\exchange-rate
|-- manifests
|   |-- ine\inflation
|   `-- bna\exchange-rate
`-- logs
```

| Area | Purpose | Mutability |
| --- | --- | --- |
| `landing` | Newly acquired assets waiting for ingestion | Temporary |
| `archive` | Exact source bytes after hashing and registration | Append-only |
| `rejected` | Assets or records that fail validation | Append-only |
| `manifests` | Source URL, timestamps, version, size and SHA-256 evidence | Append-only |
| `logs` | Pipeline execution logs | Append-only with retention policy |

## File lifecycle

1. Download or place the source asset in the matching `landing` directory.
2. Calculate SHA-256 before transformation.
3. Create a manifest with source URL, acquisition UTC timestamp, publication
   date, source version, content type, byte size and checksum.
4. Register the ingestion batch and source asset in SQL Server Bronze.
5. Move the exact asset to `archive` after a successful Bronze load.
6. Move invalid assets to `rejected`; never silently overwrite them.
7. Write the run outcome to `logs` and the SQL audit tables.

## Naming convention

Use lowercase source and indicator codes plus the publication or acquisition
date when the source does not provide a stable filename:

```text
ine_inflation_YYYYMMDD_<source-version>.<extension>
bna_exchange-rate_YYYYMMDD_<source-version>.<extension>
```

Files with the same name but different content must receive a version suffix.
Files with the same SHA-256 must be treated as duplicate acquisitions.

## Access model

The first POC pipeline will read and write these directories under the current
Windows user and load SQL Server through parameterized connections. SQL Server
does not require direct filesystem access unless a future design introduces
`BULK INSERT` or SQL-managed file operations.

