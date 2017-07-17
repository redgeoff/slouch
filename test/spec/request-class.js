'use strict';

var RequestClass = require('../../scripts/request-class'),
  sporks = require('sporks');

describe('request-class', function () {

  var consoleLog = console.log,
    request = null;

  beforeEach(function () {
    request = new RequestClass();
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

});
