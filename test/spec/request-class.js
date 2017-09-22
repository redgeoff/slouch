'use strict';

var RequestClass = require('../../scripts/request-class'),
  sporks = require('sporks'),
  Backoff = require('backoff-promise'),
  Promise = require('sporks/scripts/promise'),
  request = require('request');

describe('request-class', function () {

  var consoleLog = console.log,
    requestClass = null,
    defaultRequest = null;

  beforeEach(function () {
    requestClass = new RequestClass(request);
    defaultRequest = requestClass.request;

    // Shorten the backoff
    requestClass._newBackoff = function () {
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

    requestClass._log('foo');
    logged.should.eql('foo');
  });

  it('should get 404 status code', function () {
    requestClass._getStatusCode({
      reason: 'Could not open source database'
    }).should.eql(404);
  });

  it('should handle malformed error', function () {
    // Fake
    requestClass._req = function () {
      return Promise.resolve(null);
    };

    return sporks.shouldThrow(function () {
      return requestClass._request();
    });
  });

  it('should reconnect when all DBs active', function () {
    var err = new Error('all_dbs_active');
    requestClass._shouldReconnect(err).should.eql(true);
  });

  it('should throw error reach max retries', function () {
    var err = new Error('all_dbs_active');

    // Fake
    requestClass._request = function () {
      return sporks.promiseError(err);
    };

    return sporks.shouldThrow(function () {
      return requestClass.request();
    }, err);
  });

  it('should ignore default_authentication_handler errors when requesting', function () {
    var err = new Error('default_authentication_handler');

    // Fake
    requestClass._request = function () {
      return sporks.promiseError(err);
    };

    return requestClass.request();
  });

  it('should set max connections', function () {
    requestClass.setMaxConnections(2);
    requestClass._throttler.getMaxConcurrentProcesses().should.eql(2);
  });

  it('should handle ENOTFOUND errors', function () {
    // Shorten the backoff as in a browser we just a "Failed to Fetch" error which triggers a retry
    requestClass._newBackoff = function () {
      return new Backoff(1);
    };

    return sporks.shouldThrow(function () {
      return requestClass.request({
        url: 'http://somethingbad.example.com'
      });
    });
  });

  it('should handle ECONNREFUSED errors', function () {

    var n = 0;

    // Shorten the backoff
    requestClass._newBackoff = function () {
      return new Backoff(10);
    };

    requestClass._request = function () {
      if (++n === 3) {
        // Simulate success after several failures
        return Promise.resolve();
      } else {
        return defaultRequest.apply(this, arguments);
      }
    };

    return requestClass.request({
      url: 'http://127.0.0.1:1234'
    }).then(function () {
      n.should.eql(3);
    });
  });

  // TODO: test handling of all_dbs_active errors

});
