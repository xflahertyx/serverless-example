const { expect } = require('chai');
const { promisify } = require('util');
const AWSMock = require('aws-sdk-mock');
const fs = require('fs');
const { handler } = require('./index');

const readFile = promisify(fs.readFile);
const testXmlOrder = readFile('test-event.xml');

describe('eventProducerTests', () => {
  let sqsMessageBody;
  beforeEach(() => {
    AWSMock.mock('SQS', 'sendMessage', (params, callback) => {
      sqsMessageBody = JSON.parse(params.MessageBody);
      callback(null, {});
    });
  });
  describe('successful event', async () => {
    afterEach(() => AWSMock.restore());
    let response;
    let order;

    beforeEach(async () => {
      order = await testXmlOrder;
      response = await handler(order.toString());
    });

    it('should send event to SQS', () => expect(response).to.equal(200));
    it('should have a requestId', () =>
      expect(
        sqsMessageBody['ns0:Envelope']['ns0:Body'].Payload.orderRequestId
      ).to.equal('9871g84f4539087435980435'));
  });
});
