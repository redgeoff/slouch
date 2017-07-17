'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks');

describe('config', function () {

  var slouch = null,
    config = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    config = slouch.config;
  });

  it('should couch_httpd_auth/timeout', function () {
    return config.setCouchHttpdAuthTimeout(3600);
  });

});
