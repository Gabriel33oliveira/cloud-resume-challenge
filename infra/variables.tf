variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "site_bucket_name" {
  description = "Globally unique S3 bucket name for the static site"
  type        = string
  # Matches the bucket actually running in production. Kept as-is
  # (typo and all) rather than "corrected" here, see the README for why.
  default = "gabriel-luz-portifolio"
}

variable "counter_table_name" {
  description = "DynamoDB table name for the visitor counter"
  type        = string
  default     = "portifolio-visitor-counter"
}

variable "lambda_function_name" {
  description = "Name of the visitor-counter Lambda function"
  type        = string
  default     = "portifolio-visitor-counter"
}
