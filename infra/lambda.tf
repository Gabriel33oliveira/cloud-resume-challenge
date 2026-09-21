data "archive_file" "visitor_counter" {
  type        = "zip"
  source_file = "${path.module}/../backend/lambda_function.py"
  output_path = "${path.module}/build/visitor_counter.zip"
}

resource "aws_iam_role" "visitor_counter" {
  name = "${var.lambda_function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Baseline CloudWatch Logs permissions, the same managed policy the console
# attaches automatically when you create a function from scratch.
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.visitor_counter.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# The one thing this function actually needs: increment a single item in
# one specific table. No Query, no Scan, no other tables.
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.lambda_function_name}-dynamodb-access"
  role = aws_iam_role.visitor_counter.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "dynamodb:UpdateItem"
      Resource = aws_dynamodb_table.visitor_counter.arn
    }]
  })
}

resource "aws_lambda_function" "visitor_counter" {
  function_name    = var.lambda_function_name
  role             = aws_iam_role.visitor_counter.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.13"
  filename         = data.archive_file.visitor_counter.output_path
  source_code_hash = data.archive_file.visitor_counter.output_base64sha256
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.visitor_counter.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.visitor_counter.execution_arn}/*/*"
}
