'use strict';

var System = require('../../scripts/system'),
  config = require('../config.json');

describe('db', function () {

  var url = config.couchdb.scheme + '://' + config.couchdb.username + ':' +
    config.couchdb.password + '@' + config.couchdb.host + ':' + config.couchdb.port,
    system = new System(url);

  it('should iterate through dbs', function () {
    var dbNames = [];

    return system.dbsIterator().each(function (db) {
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
