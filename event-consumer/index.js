const AWS = require('aws-sdk');
const fetch = require('node-fetch');

const DLQ_BUCKET = process.env.DLQ_BUCKET;
const ENDPOINT_URL = process.env.ENDPOINT_URL;
const QUEUE_URL = process.env.QUEUE_URL;

let s3;
let sqs;

const errHandler = (err, msg) => {
  const error = new Error(msg);
  error.stack += `\n${err.stack}`;
  throw error;
};

const sendMessageToDlq = (event, id) =>
  s3.putObject({
    Bucket: DLQ_BUCKET,
    Key: `xml/failure/${id}`,
    Body: event
  })
  .promise()
  .catch(err => errHandler(err, 'failed to send event to dlq bucket'));

const removeMessageFromQueue = (ReceiptHandle) =>
  sqs.deleteMessage({ QueueUrl: QUEUE_URL, ReceiptHandle })
    .promise()
    .catch(e => errHandler(e, 'Message Removal Failure'));

const splitName = name => {
  const fullName = name.split(' ');
  const firstName = fullName[0];
  const lastName = fullName.slice(1, fullName.length).join(' ');
  if (lastName.trim().length === 0) throw Error('missing last name');
  return { firstName: firstName.trim(), lastName: lastName.trim() };
};

const convertToAPI = eventBody => {
  const parsedEvent = JSON.parse(eventBody);
  const {
    'ns0:Envelope': {'ns0:Body': { Payload }}
  } = parsedEvent;
  const { orderShipRequest, orderRequestId } = Payload;
  const {
    itemProcessSku: sku,
    requestShipQuantity: qty,
    customerDestination: address,
    customIdentification: name,
    shippingCarrierConfiguration: { carrier, shippingServiceLevel: shipMethod }
  } = orderShipRequest;
  const { firstName, lastName } = splitName(name);
  const {
    streetAddressOne: streetAddress,
    streetAddressTwo: aptOther,
    city,
    state,
    zip
  } = address;
  return {
    eventId: orderRequestId,
    lineItems: [{ qty, sku }],
    firstName,
    lastName,
    address: { streetAddress, aptOther, city, state, zip },
    carrier,
    shipMethod
  };
};

const sendEventToEndpoint = async convertedEvent => {
  const params = {
    method: 'POST',
    body: JSON.stringify(convertedEvent),
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const response = await fetch(ENDPOINT_URL, params);
  const json = await response.json();
  // TODO: more complex retry/dlq logic can be added to address 5XX vs 4XX responses 
  return { statusCode: response.status, body: json };
};

const processMessage = async (message) => {
  const { body, receiptHandle } = message;
  try {
    const convertedEvent = convertToAPI(body);
    // for demo purposes the message will logged, but not sent to an endpoint
    if (ENDPOINT_URL !== "false") await sendEventToEndpoint(convertedEvent);
    console.log("event: ", JSON.stringify(convertedEvent));
    await removeMessageFromQueue(receiptHandle);
  } catch (error) {
    console.log(error);
    await sendMessageToDlq(body);
    await removeMessageFromQueue(receiptHandle);
  }
} 

const handler = async event => {
  s3 = new AWS.S3();
  sqs = new AWS.SQS();
  const { Records: messages = [] } = event;
  await Promise.all(messages.map(m => processMessage(m, handler)));
};

module.exports.handler = handler;
