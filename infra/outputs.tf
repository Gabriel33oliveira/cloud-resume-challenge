output "cloudfront_domain_name" {
  description = "Public URL the site is served from"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "api_invoke_url" {
  description = "Base URL of the visitor-counter API"
  value       = aws_apigatewayv2_api.visitor_counter.api_endpoint
}
