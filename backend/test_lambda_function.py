import json
import os
import unittest
from decimal import Decimal
from unittest.mock import patch

# lambda_function creates a boto3 DynamoDB resource at import time, which
# requires a region even though these tests never make a real AWS call.
# Setting it here keeps the suite self-contained: it runs the same on any
# machine, with no AWS credentials or config file required.
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')

import lambda_function


class TestVisitorCounterLambda(unittest.TestCase):
    """Unit tests for the visitor-counter Lambda.

    DynamoDB itself is never called: `table` is replaced with a mock so
    these tests run instantly and need no AWS credentials or network access.
    """

    @patch('lambda_function.table')
    def test_calls_dynamodb_with_the_right_atomic_update(self, mock_table):
        mock_table.update_item.return_value = {'Attributes': {'count': 42}}

        lambda_function.lambda_handler({}, None)

        mock_table.update_item.assert_called_once_with(
            Key={'id': 'visits'},
            UpdateExpression='ADD #count :incr',
            ExpressionAttributeNames={'#count': 'count'},
            ExpressionAttributeValues={':incr': 1},
            ReturnValues='UPDATED_NEW'
        )

    @patch('lambda_function.table')
    def test_returns_200_with_the_new_count(self, mock_table):
        mock_table.update_item.return_value = {'Attributes': {'count': 42}}

        response = lambda_function.lambda_handler({}, None)

        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(json.loads(response['body']), {'count': 42})

    @patch('lambda_function.table')
    def test_includes_cors_headers_for_the_browser(self, mock_table):
        mock_table.update_item.return_value = {'Attributes': {'count': 1}}

        response = lambda_function.lambda_handler({}, None)

        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], '*')
        self.assertIn('GET', response['headers']['Access-Control-Allow-Methods'])

    @patch('lambda_function.table')
    def test_coerces_dynamodb_decimal_to_a_json_serializable_int(self, mock_table):
        # DynamoDB always returns numbers as Decimal, which json.dumps cannot
        # serialize on its own. This is the exact bug the int(...) cast in
        # lambda_function.py exists to prevent, this test guards it.
        mock_table.update_item.return_value = {'Attributes': {'count': Decimal('7')}}

        response = lambda_function.lambda_handler({}, None)
        body = json.loads(response['body'])

        self.assertIsInstance(body['count'], int)
        self.assertEqual(body['count'], 7)


if __name__ == '__main__':
    unittest.main()
