const AWS = require('aws-sdk');
const { parse } = require('fast-xml-parser');

const sqs = sqs = new AWS.SQS();
const s3 = new AWS.S3();

const errHandler = (err, msg) => {
  const error = new Error(msg);
  error.stack += `\n${err.stack}`;
  throw error;
};

const sendSqsMessage = body => sqs.sendMessage({
  QueueUrl: QUEUE_URL,
  MessageBody: JSON.stringify(body)
}).promise()
  .catch(err => errHandler(err, 'failed to send message to queue'));

const sendMessageToDlq = (event, id) => s3.putObject({
  Bucket: DLQ_BUCKET,
  Key: `xml/failure/${id}`,
  Body: event
}).promise()
  .catch(err => errHandler(err, 'failed to send event to dlq bucket'));
  
const converXmlToJson = (event) => {
  const parserOptions = {
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseTrueNumberOnly: true
    
  };
  return parse(event, parserOptions);
};

const validateEvent = event => {};

const handler = async (event) => {
  console.log(event);
  const body = event.body || event;
  try {
    const eventJson = converXmlToJson(body);
    validateEvent(eventJson);
    await sendSqsMessage(eventJson);
  } catch (error) {
    console.log(error);
    sendMessageToDlq(body);
  }
}

module.exports.handler = handler;
