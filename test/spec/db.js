'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

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

  it('should iterate through dbs', function () {
    var dbNames = [];

    return db.all().each(function (db) {
      dbNames.push(db);
    }).then(function () {
      // Make sure db names were captured
      (dbNames.should.length === 0).should.eql(false);

      // Make sure a specific DB like _users was captured
      var usersFound = false;
      dbNames.forEach(function (dbName) {
        if (dbName === '_users') {
          usersFound = true;
        }
      });
      usersFound.should.eql(true);
    });
  });

});
