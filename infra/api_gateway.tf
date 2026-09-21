resource "aws_apigatewayv2_api" "visitor_counter" {
  name          = "${var.lambda_function_name}-api"
  protocol_type = "HTTP"

  # The CORS origin is CloudFront's own domain name, read directly from that
  # resource instead of hardcoded, so the two can never silently drift apart.
  cors_configuration {
    allow_origins = ["https://${aws_cloudfront_distribution.site.domain_name}"]
    allow_methods = ["GET"]
  }
}

resource "aws_apigatewayv2_integration" "visitor_counter" {
  api_id                 = aws_apigatewayv2_api.visitor_counter.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.visitor_counter.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_count" {
  api_id    = aws_apigatewayv2_api.visitor_counter.id
  route_key = "GET /count"
  target    = "integrations/${aws_apigatewayv2_integration.visitor_counter.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.visitor_counter.id
  name        = "$default"
  auto_deploy = true
}
