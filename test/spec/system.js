'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('system', function () {

  var slouch = null,
    db = null,
    system = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    system = slouch.system;
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  var fakeCouchDBVersion = function (version) {
    system.get = function () {
      return Promise.resolve({ version: [version] });
    };
  };

  it('should check if couchdb 1', function () {
    // We run the tests on both CouchDB 1 and 2 and so we don't care about the version. In the
    // future, we could pass a paramter to our test scripts that would allow us to test this better.
    return system.isCouchDB1();
  });

  it('should detect couchdb 1', function () {
    fakeCouchDBVersion('1');
    return system.isCouchDB1().then(function (is1) {
      is1.should.eql(true);
    });
  });

  it('should cache if couchdb 1', function () {
    fakeCouchDBVersion('1');
    return system.isCouchDB1().then(function () {
      return system.isCouchDB1();
    }).then(function (is1) {
      is1.should.eql(true);
    });
  });

});
