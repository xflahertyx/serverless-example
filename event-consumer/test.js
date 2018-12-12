const { expect } = require('chai');
const AWSMock = require('aws-sdk-mock');
const nock = require('nock');
const { handler } = require('./index');

const testSqsEvent = require('./test-sqs-event.json');
const noLastNameEvent = require('./test-sqs-event-no-last-name.json');

describe('eventConsumerTests', () => {
  let sqsEventDeleted = false;
  let s3Event = {};
  let request = {};

  beforeEach(() => {
    AWSMock.mock('S3', 'putObject', (params, callback) => {
      s3Event = JSON.parse(params.Body);
      callback(null, {});
    });
    AWSMock.mock('SQS', 'deleteMessage', (params, callback) => {
      sqsEventDeleted = true;
      callback(null, {});
    });
  });
  beforeEach(() => {
    nock('http://testapi.com')
      .post('/order')
      .reply((uri, requestBody, cb) => {
        request = requestBody;
        cb(null, [200, JSON.stringify({})]);
      });
  });
  afterEach(() => AWSMock.restore());
  afterEach(() => {
    sqsEventDeleted = false;
    s3Event = {};
    request = {};
  });

  describe('successful event', async () => {
    beforeEach(async () => await handler(testSqsEvent));

    it('should parse the event', () => {
      expect(sqsEventDeleted).to.be.true;
      expect(request.eventId).to.equal('9871g84f4539087435980435');
      expect(s3Event).to.be.empty;
    });
  });

  describe('missing last name', () => {
    beforeEach(async () => await handler(noLastNameEvent));
    it('should err and send the message to the DLQ', () => {
      expect(
        s3Event['ns0:Envelope']['ns0:Body'].Payload.orderRequestId)
          .to.equal('9871g84f4539087435980435');
    });
  });
});
