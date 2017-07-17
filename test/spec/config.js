'use strict';

// Note: we need to make sure that we have complete test coverage on both CouchDB 1 and CouchDB 2,
// but also want to test against the actual DB.

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks');

describe('config', function () {

  var slouch = null,
    config = null,
    requests = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    config = slouch.config;
    requests = [];
  });

  var fakeIsCouchDB1 = function (isCouchDB1) {
    slouch.system.isCouchDB1 = function () {
      return Promise.resolve(isCouchDB1);
    };
  };

  var mockRequest = function (nodes) {
    config._req = {
      request: function (opts) {
        requests.push(opts);
        return Promise.resolve();
      }
    };

    slouch.membership.get = function () {
      return Promise.resolve({
        cluster_nodes: nodes
      });
    };
  };

  var shouldSet = function (isCouchDB1, nodes) {
    fakeIsCouchDB1(isCouchDB1);
    mockRequest(nodes);
    return config.set('foo', 'bar').then(function () {
      // Sanity test
      JSON.parse(requests[0].body).should.eql('bar');
    });
  };

  it('should set for couchdb 1', function () {
    return shouldSet(true);
  });

  it('should set for couchdb 2', function () {
    return shouldSet(false, ['node1']);
  });

  it('should set for couchdb 2 when multiple nodes', function () {
    return shouldSet(false, ['node1', 'node2']);
  });

  it('should request for max nodes', function () {
    fakeIsCouchDB1(false);
    mockRequest(['node1', 'node2', 'node3']);
    return config._request('path', {}, true, 2);
  });

  it('should couch_httpd_auth/timeout', function () {
    return config.setCouchHttpdAuthTimeout(3600);
  });

  it('should get and unset', function () {
    return config.setLogLevel('warning').then(function () {
      return config.get('log/level');
    }).then(function (value) {
      value.should.eql('warning');

      return config.unset('log/level');
    }).then(function () {
      return sporks.shouldThrow(function () {
        return config.get('log/level');
      });
    });
  });

  it('should unset ignore missing', function () {
    return config.setLogLevel('info').then(function () {
      return config.unset('log/level');
    }).then(function () {
      return config.unsetIgnoreMissing('log/level');
    });
  });

  it('should set couch_httpd_auth/allow_persistent_cookies', function () {
    return config.setCouchHttpdAuthAllowPersistentCookies(true).then(function () {
      return config.setCouchHttpdAuthAllowPersistentCookies(false);
    }).then(function () {
      config.setCouchHttpdAuthAllowPersistentCookies('true');
    });
  });

});
