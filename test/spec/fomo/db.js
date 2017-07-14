'use strict';

var Slouch = require('../../../scripts/fomo'),
  utils = require('../../utils');

describe('db', function () {

  var db = new Slouch(utils.couchDBURL()).db;

  beforeEach(function () {
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  it('should check if exists', function () {
    return db.exists('testdb').then(function (exists) {
      exists.should.eql(true);
    }).then(function () {
      return db.exists('testdb2');
    }).then(function (exists) {
      exists.should.eql(false);
    });
  });

});
