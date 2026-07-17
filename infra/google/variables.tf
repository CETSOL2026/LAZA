variable "project_id" {
  description = "Google Cloud project ID for this LAZA environment."
  type        = string
}

variable "environment" {
  description = "Environment code: dev, hml or prd."
  type        = string

  validation {
    condition     = contains(["dev", "hml", "prd"], var.environment)
    error_message = "environment must be one of: dev, hml, prd."
  }
}

variable "region" {
  description = "Default Google Cloud region for regional resources."
  type        = string
  default     = "europe-west1"
}

variable "bucket_location" {
  description = "Cloud Storage bucket location."
  type        = string
  default     = "EU"
}

variable "bucket_prefix" {
  description = "Prefix for globally unique LAZA bucket names."
  type        = string
  default     = "laza"
}

variable "labels" {
  description = "Common labels applied to supported resources."
  type        = map(string)
  default     = {}
}

variable "landing_retention_days" {
  description = "Retention in days for transient landing files."
  type        = number
  default     = 30
}

variable "rejected_retention_days" {
  description = "Retention in days for rejected extracts and payloads."
  type        = number
  default     = 180
}

variable "logs_retention_days" {
  description = "Retention in days for exported operational logs."
  type        = number
  default     = 365
}

variable "force_destroy_buckets" {
  description = "Whether Terraform may destroy non-empty buckets. Keep false outside throwaway DEV."
  type        = bool
  default     = false
}
