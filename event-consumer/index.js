const AWS = require('aws-sdk');
const fetch = require('node-fetch');

const DLQ_BUCKET = process.env.DLQ_BUCKET;
const QUEUE_URL = process.env.QUEUE_URL;
let s3;

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

const removeMessageFromQueue = ({ receiptHandle: ReceiptHandle }) =>
  SQS.deleteMessage({ QueueUrl: QUEUE_URL, ReceiptHandle })
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
  const {
    'ns0:Envelope': ns0Envelope,
    'ns0:Body': { Payload }
  } = eventBody;
  const { orderShipRequest, orderReqestId } = Payload;
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
    eventId: orderReqestId,
    lineItems: [{ qty, sku }],
    firstName,
    lastName,
    address: { streetAddress, aptOther, city, state, zip },
    carrier,
    shipMethod
  };
};

// const sendEventToEndpoint = async convertedEvent => {
//   const url = process.env.ENDPOINT_URL;
//   const params = {
//     method: 'POST',
//     body: JSON.stringify(convertedEvent),
//     headers: {
//       'Content-Type': 'application/json'
//     }
//   };
//   const response = await fetch(url, params);
//   const json = await response.json();
//   return { statusCode: response.status, body: json };
// };

const processMessage = async (message) => {
  try {
    const { body, receiptHandle } = message;
    console.log("event", message);
    const convertedEvent = convertToAPI(body);
    console.log(JSON.stringify(convertedEvent));
    // await sendEventToEndpoint(convertedEvent);
    await removeMessageFromQueue(receiptHandle);
  } catch (error) {
    console.log(error);
    await sendMessageToDlq(body);
    await removeMessageFromQueue(receiptHandle);
  }
} 

const handler = async event => {
  s3 = new AWS.S3();
  event.Records.forEach(processMessage);
};

module.exports.handler = handler;
