'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  Promise = require('sporks/scripts/promise');

describe('membership', function () {

  var slouch = null,
    membership = null,
    defaultRequest = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    membership = slouch.membership;
    defaultRequest = membership._request;
  });

  afterEach(function () {
    membership._request = defaultRequest;
  });

  it('should get membership in couchdb 1', function () {
    return slouch.system.isCouchDB1().then(function (isCouchDB1) {
      if (isCouchDB1) {
        // Fake the request so that this code is covered when running against CouchDB 1
        membership._request = {
          request: function () {
            return Promise.resolve();
          }
        };

        return membership.get();
      }
    });
  });

});
