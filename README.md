# serverless-example

## Getting started
Follow https://serverless.com/framework/docs/providers/aws/guide/quick-start/ to install serverless and 
https://serverless.com/framework/docs/providers/aws/guide/credentials/ to set up AWS access. 

In addition to the permissions defined by the gist https://gist.github.com/ServerlessBot/7618156b8671840a539f405dea2704c8, add `"iam:AttachRolePolicy"` to the role you created. 

after running 
```sh
serverless deploy
```
You will need to enable the SQS trigger from the Lambda console for the event-consumer function. 
