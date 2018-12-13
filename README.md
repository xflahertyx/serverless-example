# Serverless Microservice Example

Deploy a pub-sub style http service that will convert an xml payload to json and convert that json to an example API:

event-producer (AWS Lambda) -> AWS SQS Queue -> event-consumer (AWS Lambda)

The event-consumer can be configured to send an http request to an endpoint, but it has been disabled by default. 

## Before deploying

Run `npm install` in the root directory as well as the /event-consumer and /event-producer directories. 

## Getting started
Follow https://serverless.com/framework/docs/providers/aws/guide/quick-start/ to install serverless and 
https://serverless.com/framework/docs/providers/aws/guide/credentials/ to set up AWS access. 

In addition to the permissions defined by the gist https://gist.github.com/ServerlessBot/7618156b8671840a539f405dea2704c8, add `"iam:AttachRolePolicy"` to the role you created. 

After running `serverless deploy`, you will need to enable the SQS trigger from the AWS Lambda console for the event-consumer function. 

## Testing

You can copy the example xml payload from the test-file and send it via curl or Postman to the POST endpoint displayed after running `serverless deploy`

Example:

```sh
endpoints:
  POST - https://abcdefg.execute-api.us-west-2.amazonaws.com/dev/events
```
