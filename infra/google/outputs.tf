output "project_id" {
  description = "Google Cloud project ID."
  value       = var.project_id
}

output "environment" {
  description = "LAZA environment code."
  value       = var.environment
}

output "bucket_names" {
  description = "Cloud Storage bucket names by logical role."
  value = {
    for key, bucket in google_storage_bucket.laza : key => bucket.name
  }
}

output "bigquery_datasets" {
  description = "BigQuery dataset IDs by medallion layer."
  value = {
    for key, dataset in google_bigquery_dataset.laza : key => dataset.dataset_id
  }
}

output "service_accounts" {
  description = "Service account emails by responsibility."
  value = {
    extraction     = google_service_account.extraction.email
    transformation = google_service_account.transformation.email
    publication    = google_service_account.publication.email
    api            = google_service_account.api.email
  }
}
