'use strict';

var RequestClass = require('../../scripts/request-class'),
  sporks = require('sporks'),
  Backoff = require('backoff-promise');

describe('request-class', function () {

  var consoleLog = console.log,
    request = null;

  beforeEach(function () {
    request = new RequestClass();

    // Shorten the backoff
    request._newBackoff = function () {
      return new Backoff(10);
    };
  });

  afterEach(function () {
    // Restore console log
    console.log = consoleLog;

    RequestClass.LOG_EVERYTHING = false;
  });

  it('should log', function () {
    RequestClass.LOG_EVERYTHING = true;

    var logged = null;

    // Spy
    console.log = function (str) {
      logged = str;
    };

    request._log('foo');
    logged.should.eql('foo');
  });

  it('should get 404 status code', function () {
    request._getStatusCode({
      reason: 'Could not open source database'
    }).should.eql(404);
  });

  it('should handle malformed error', function () {
    // Fake
    request._req = function () {
      return Promise.resolve(null);
    };

    return sporks.shouldThrow(function () {
      return request._request();
    });
  });

  it('should reconnect when all DBs active', function () {
    var err = new Error('all_dbs_active');
    request._shouldReconnect(err).should.eql(true);
  });

  it('should throw error reach max retries', function () {
    var err = new Error('all_dbs_active');

    // Fake
    request._request = function () {
      return sporks.promiseError(err);
    };

    return sporks.shouldThrow(function () {
      return request.request();
    }, err);
  });

  it('should ignore default_authentication_handler errors when requesting', function () {
    var err = new Error('default_authentication_handler');

    // Fake
    request._request = function () {
      return sporks.promiseError(err);
    };

    return request.request();
  });

  it('should set max connections', function () {
    request.setMaxConnections(2);
    request._throttler.getMaxConcurrentProcesses().should.eql(2);
  });

});
