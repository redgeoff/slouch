'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('system', function () {

  var slouch = new Slouch(utils.couchDBURL()),
    db = slouch.db,
    system = slouch.system;

  beforeEach(function () {
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
