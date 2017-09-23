'use strict';

var EnhancedRequest = require('../../scripts/enhanced-request'),
  sporks = require('sporks'),
  Backoff = require('backoff-promise'),
  Promise = require('sporks/scripts/promise'),
  request = require('request');

describe('enhanced-request', function () {

  var consoleLog = console.log,
    enhancedRequest = null,
    defaultRequest = null;

  beforeEach(function () {
    enhancedRequest = new EnhancedRequest(request);
    defaultRequest = enhancedRequest.request;

    // Shorten the backoff
    enhancedRequest._newBackoff = function () {
      return new Backoff(10);
    };
  });

  afterEach(function () {
    // Restore console log
    console.log = consoleLog;

    EnhancedRequest.LOG_EVERYTHING = false;
  });

  it('should log', function () {
    EnhancedRequest.LOG_EVERYTHING = true;

    var logged = null;

    // Spy
    console.log = function (str) {
      logged = str;
    };

    enhancedRequest._log('foo');
    logged.should.eql('foo');
  });

  it('should get 404 status code', function () {
    enhancedRequest._getStatusCode({
      reason: 'Could not open source database'
    }).should.eql(404);
  });

  it('should handle malformed error', function () {
    // Fake
    enhancedRequest._req = function () {
      return Promise.resolve(null);
    };

    return sporks.shouldThrow(function () {
      return enhancedRequest._request();
    });
  });

  it('should reconnect when all DBs active', function () {
    var err = new Error('all_dbs_active');
    enhancedRequest._shouldReconnect(err).should.eql(true);
  });

  it('should throw error reach max retries', function () {
    var err = new Error('all_dbs_active');

    // Fake
    enhancedRequest._request = function () {
      return sporks.promiseError(err);
    };

    return sporks.shouldThrow(function () {
      return enhancedRequest.request();
    }, err);
  });

  it('should ignore default_authentication_handler errors when requesting', function () {
    var err = new Error('default_authentication_handler');

    // Fake
    enhancedRequest._request = function () {
      return sporks.promiseError(err);
    };

    return enhancedRequest.request();
  });

  it('should set max connections', function () {
    enhancedRequest.setMaxConnections(2);
    enhancedRequest._throttler.getMaxConcurrentProcesses().should.eql(2);
  });

  it('should handle ENOTFOUND errors', function () {
    // Shorten the backoff as in a browser we just a "Failed to Fetch" error which triggers a retry
    enhancedRequest._newBackoff = function () {
      return new Backoff(1);
    };

    return sporks.shouldThrow(function () {
      return enhancedRequest.request({
        url: 'http://somethingbad.example.com'
      });
    });
  });

  it('should handle ECONNREFUSED errors', function () {

    var n = 0;

    // Shorten the backoff
    enhancedRequest._newBackoff = function () {
      return new Backoff(10);
    };

    enhancedRequest._request = function () {
      if (++n === 3) {
        // Simulate success after several failures
        return Promise.resolve();
      } else {
        return defaultRequest.apply(this, arguments);
      }
    };

    return enhancedRequest.request({
      url: 'http://127.0.0.1:1234'
    }).then(function () {
      n.should.eql(3);
    });
  });

  // TODO: test handling of all_dbs_active errors

});
