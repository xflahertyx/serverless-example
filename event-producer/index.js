const AWS = require('aws-sdk');
const { parse } = require('fast-xml-parser');
const { Validator } = require('jsonschema');
const yaml = require('js-yaml');
const fs = require('fs');

let sqs;

const QUEUE_URL = process.env.QUEUE_URL;

const errHandler = (err, msg) => {
  const error = new Error(msg);
  error.stack += `\n${err.stack}`;
  throw error;
};

const sendSqsMessage = body =>
  sqs
    .sendMessage({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(body)
    })
    .promise()
    .catch(err => errHandler(err, 'failed to send message to queue'));

class ValidationError extends Error {}

const validate = json => {
  const schema = yaml.safeLoad(
    fs.readFileSync(`${__dirname}/event-schema.yaml`, 'utf8')
  );
  const xmlSchema = schema.definitions.xmlEvent;
  const validator = new Validator();
  const validationResult = validator.validate(json, xmlSchema);
  if (!validationResult || validationResult.errors.length !== 0) {
    throw new ValidationError(
      `Validation Error: ${validationResult.errors.map(e => e.stack)}`
    );
  }
};

const parseXmlToJson = event => {
  const parserOptions = {
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseTrueNumberOnly: true
  };
  return parse(event, parserOptions);
};

const handler = async event => {
  sqs = new AWS.SQS();
  const body = event.body || event;
  try {
    const eventJson = await parseXmlToJson(body);
    validate(eventJson);
    await sendSqsMessage(eventJson);
    console.log('send message success');
    return { statusCode: 200 };
  } catch (error) {
    console.log(error);
    if (error instanceof ValidationError) {
      return { statusCode: 400 };
    }
    return { statusCode: 500 };
  }
};

module.exports.handler = handler;
