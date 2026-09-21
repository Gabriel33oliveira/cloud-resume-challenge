# On-demand billing: no capacity to plan for a personal portfolio's traffic,
# and no cost at all when nobody's visiting.
resource "aws_dynamodb_table" "visitor_counter" {
  name         = var.counter_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}
