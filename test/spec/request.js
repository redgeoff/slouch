'use strict';

var request = require('../../scripts/request'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise'),
  Backoff = require('backoff-promise');

describe('request', function () {

  // Save so that it can be restored after mocking
  var requestRequest = request._request,
    requestNewBackoff = request._newBackoff;

  afterEach(function () {
    // Restore after mocking
    request._request = requestRequest;
    request._newBackoff = requestNewBackoff;
  });

  it('should handle ENOTFOUND errors', function () {
    // Shorten the backoff as in a browser we just a "Failed to Fetch" error which triggers a retry
    request._newBackoff = function () {
      return new Backoff(10);
    };

    return sporks.shouldThrow(function () {
      return request.request({
        url: 'http://somethingbad.example.com'
      });
    });
  });

  it('should handle ECONNREFUSED errors', function () {

    var n = 0;

    // Shorten the backoff
    request._newBackoff = function () {
      return new Backoff(10);
    };

    request._request = function () {
      if (++n === 3) {
        // Simulate success after several failures
        return Promise.resolve();
      } else {
        return requestRequest.apply(this, arguments);
      }
    };

    return request.request({
      url: 'http://127.0.0.1:1234'
    }).then(function () {
      n.should.eql(3);
    });
  });

  // TODO: test handling of all_dbs_active errors

});
