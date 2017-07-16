'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  FakedStreamIterator = require('./faked-stream-iterator');

describe('system', function () {

  var slouch = null,
    db = null,
    system = null,
    destroyed = null,
    created = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    system = slouch.system;
    destroyed = [];
    created = [];
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

  var fakeDBAll = function (dbs) {
    slouch.db.all = function () {
      return new FakedStreamIterator(dbs);
    };
  };

  var fakeCreateAndDestroy = function () {
    slouch.db.create = function (dbName) {
      created.push(dbName);
      return Promise.resolve();
    };

    slouch.db.destroy = function (dbName) {
      destroyed.push(dbName);
      return Promise.resolve();
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

  it('should reset when couchdb 1', function () {
    fakeCouchDBVersion('1');
    fakeDBAll(['_replicator', 'testa', 'testb']);
    fakeCreateAndDestroy();

    return system.reset().then(function () {
      created.should.eql(['_replicator']);
      destroyed.should.eql(['_replicator', 'testa', 'testb']);

      created = [];
      destroyed = [];

      // Now try the exceptDBNames param
      return system.reset(['testb']);
    }).then(function () {
      created.should.eql(['_replicator']);
      destroyed.should.eql(['_replicator', 'testa']);
    });
  });

  it('should reset when not couchdb', function () {
    fakeCouchDBVersion('2');
    fakeDBAll(['_replicator', '_global_changes', '_users', 'testa', 'testb']);
    fakeCreateAndDestroy();

    return system.reset().then(function () {
      created.should.eql(['_replicator', '_global_changes', '_users']);
      destroyed.should.eql(['_replicator', '_global_changes', '_users', 'testa', 'testb']);
    });
  });

  it('should listen for updates', function () {
    var promise = new Promise(function (resolve, reject) {
      system.updates().each(function (update) {
        if (update.db_name === 'testdb' && update.type === 'updated') {
          resolve();
        }
      }).catch(function (err) {
        reject(err);
      });
    });

    return slouch.doc.create('testdb', {
      foo: 'bar'
    }).then(function () {
      return promise;
    });
  });

});
