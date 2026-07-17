locals {
  common_labels = merge(
    {
      app         = "laza"
      environment = var.environment
      managed_by  = "terraform"
      work_item   = "laza-034"
    },
    var.labels
  )

  services = toset([
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "bigquerydatatransfer.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "dataform.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "workflows.googleapis.com"
  ])

  datasets = {
    control   = "Pipeline definitions, runs, batches and operational state"
    audit     = "Append-only events and rejected-record metadata"
    reference = "Sources, units, geographies, frequencies and controlled vocabularies"
    bronze    = "Raw source records and lineage"
    silver    = "Canonical observations and series definitions"
    dq        = "Data-quality rules, results, exceptions, approvals and scores"
    gold      = "Consumption facts and dimensions"
    api       = "Stable views consumed by the API"
  }

  buckets = {
    landing = {
      suffix         = "landing"
      versioning     = false
      retention_days = var.landing_retention_days
    }
    bronze_assets = {
      suffix         = "bronze-assets"
      versioning     = true
      retention_days = null
    }
    rejected = {
      suffix         = "rejected"
      versioning     = true
      retention_days = var.rejected_retention_days
    }
    manifests = {
      suffix         = "manifests"
      versioning     = true
      retention_days = null
    }
    logs = {
      suffix         = "logs"
      versioning     = false
      retention_days = var.logs_retention_days
    }
  }
}

resource "google_project_service" "required" {
  for_each = local.services

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_storage_bucket" "laza" {
  for_each = local.buckets

  name                        = "${var.bucket_prefix}-${var.environment}-${each.value.suffix}-${var.project_id}"
  project                     = var.project_id
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  force_destroy               = var.force_destroy_buckets
  labels                      = local.common_labels

  versioning {
    enabled = each.value.versioning
  }

  dynamic "lifecycle_rule" {
    for_each = each.value.retention_days == null ? [] : [each.value.retention_days]

    content {
      condition {
        age = lifecycle_rule.value
      }
      action {
        type = "Delete"
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_bigquery_dataset" "laza" {
  for_each = local.datasets

  project                    = var.project_id
  dataset_id                 = each.key
  friendly_name              = "LAZA ${upper(each.key)} ${upper(var.environment)}"
  description                = each.value
  location                   = var.bucket_location
  delete_contents_on_destroy = false
  labels                     = local.common_labels

  depends_on = [google_project_service.required]
}

resource "google_service_account" "extraction" {
  project      = var.project_id
  account_id   = "laza-${var.environment}-extraction"
  display_name = "LAZA ${upper(var.environment)} extraction jobs"
  description  = "Extracts official source assets and writes Bronze/control/audit evidence."
}

resource "google_service_account" "transformation" {
  project      = var.project_id
  account_id   = "laza-${var.environment}-transform"
  display_name = "LAZA ${upper(var.environment)} transformation jobs"
  description  = "Transforms Bronze into Silver and records DQ evidence."
}

resource "google_service_account" "publication" {
  project      = var.project_id
  account_id   = "laza-${var.environment}-publish"
  display_name = "LAZA ${upper(var.environment)} publication jobs"
  description  = "Publishes approved Silver observations to Gold and API views."
}

resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = "laza-${var.environment}-api"
  display_name = "LAZA ${upper(var.environment)} API runtime"
  description  = "Runs the read-only LAZA API and reads approved consumption datasets."
}

locals {
  pipeline_service_accounts = {
    extraction     = google_service_account.extraction.email
    transformation = google_service_account.transformation.email
    publication    = google_service_account.publication.email
  }

  dataset_writers = {
    extraction = toset(["control", "audit", "bronze"])
    transformation = toset([
      "control",
      "audit",
      "reference",
      "bronze",
      "silver",
      "dq"
    ])
    publication = toset(["reference", "silver", "dq", "gold", "api"])
  }

  api_read_datasets = toset(["api", "gold", "reference"])
}

resource "google_project_iam_member" "bigquery_job_user" {
  for_each = merge(
    local.pipeline_service_accounts,
    { api = google_service_account.api.email }
  )

  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${each.value}"
}

resource "google_bigquery_dataset_iam_member" "pipeline_dataset_editor" {
  for_each = {
    for pair in flatten([
      for sa_key, dataset_ids in local.dataset_writers : [
        for dataset_id in dataset_ids : {
          key        = "${sa_key}.${dataset_id}"
          sa_email   = local.pipeline_service_accounts[sa_key]
          dataset_id = dataset_id
        }
      ]
    ]) : pair.key => pair
  }

  project    = var.project_id
  dataset_id = google_bigquery_dataset.laza[each.value.dataset_id].dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${each.value.sa_email}"
}

resource "google_bigquery_dataset_iam_member" "api_dataset_reader" {
  for_each = local.api_read_datasets

  project    = var.project_id
  dataset_id = google_bigquery_dataset.laza[each.value].dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "extraction_landing_writer" {
  bucket = google_storage_bucket.laza["landing"].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.extraction.email}"
}

resource "google_storage_bucket_iam_member" "extraction_bronze_writer" {
  bucket = google_storage_bucket.laza["bronze_assets"].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.extraction.email}"
}

resource "google_storage_bucket_iam_member" "pipeline_rejected_writer" {
  for_each = local.pipeline_service_accounts

  bucket = google_storage_bucket.laza["rejected"].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${each.value}"
}

resource "google_storage_bucket_iam_member" "pipeline_manifest_writer" {
  for_each = local.pipeline_service_accounts

  bucket = google_storage_bucket.laza["manifests"].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${each.value}"
}

resource "google_storage_bucket_iam_member" "api_bronze_reader" {
  bucket = google_storage_bucket.laza["bronze_assets"].name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.api.email}"
}
