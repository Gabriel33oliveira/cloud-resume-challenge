import boto3
import json

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('portifolio-visitor-counter')


def lambda_handler(event, context):
    response = table.update_item(
        Key={'id': 'visits'},
        UpdateExpression='ADD #count :incr',
        ExpressionAttributeNames={'#count': 'count'},
        ExpressionAttributeValues={':incr': 1},
        ReturnValues='UPDATED_NEW'
    )

    count = int(response['Attributes']['count'])

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
        'body': json.dumps({'count': count})
    }
