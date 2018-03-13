'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  FakedStreamIterator = require('./faked-stream-iterator'),
  Promise = require('sporks/scripts/promise'),
  sporks = require('sporks');

describe('system', function () {

  var slouch = null,
    db = null,
    system = null,
    destroyed = null,
    created = null,
    defaultGet = null,
    iteratorToAbort = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    system = slouch.system;
    destroyed = [];
    created = [];
    iteratorToAbort = null;
    return utils.createDB();
  });

  afterEach(function () {
    if (iteratorToAbort) {
      iteratorToAbort.abort();
    }
    system.get = defaultGet;
    return utils.destroyDB();
  });

  var fakeCouchDBVersion = function (version) {
    defaultGet = system.get;
    system.get = function () {
      return Promise.resolve({
        version: [version]
      });
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

  it('should clone params when falsy', function () {
    system._cloneParams().should.eql({});
  });

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

  it('should reset when not couchdb 1', function () {
    fakeCouchDBVersion('2');
    fakeDBAll(['_replicator', '_users', 'testa', 'testb']);
    fakeCreateAndDestroy();

    return system.reset().then(function () {
      created.should.eql(['_replicator', '_users', '_global_changes']);
      destroyed.should.eql(['_global_changes', '_replicator', '_users', 'testa',
        'testb'
      ]);
    });
  });


  it('should listen for updates', function () {
    // var hasUpdate = false;
    return slouch.doc.create(utils.createdDB, {
      foo: 'bar'
    }).then(function () {
      return system.updates();

      // Note: the updates feed is meant for listening continuously and therefore this isn't really
      // a proper test case and so we cannot guarantee that an update will be received.
      //
      // return system.updates().each(function (update) {
      //   if (update.db_name === utils.createdDB) {
      //     hasUpdate = true;
      //   }
      // });
    }).then(function () {
      // hasUpdate.should.eql(true);
    });
  });

  it('should listen for updates continuously', function () {
    var promise = new Promise(function (resolve, reject) {
      iteratorToAbort = system.updates({
        feed: 'continuous'
      });

      iteratorToAbort.each(function (update) {
        if (update.db_name === utils.createdDB && update.type === 'updated') {
          resolve();
        }
      }).catch(function (err) {
        reject(err);
      });
    });

    // Use timeout to create on the next click, after we start listening to the updates
    return sporks.timeout().then(function () {
      return slouch.doc.create(utils.createdDB, {
        foo: 'bar'
      });
    }).then(function () {
      return promise;
    });
  });

  it('should listen for updates no history when couchdb 1', function () {
    fakeCouchDBVersion('1');

    var promise = new Promise(function (resolve, reject) {
      iteratorToAbort = system.updatesNoHistory({
        feed: 'continuous'
      });

      iteratorToAbort.each(function (update) {
        if (update.db_name === utils.createdDB && update.type === 'updated') {
          resolve();
        }
      }).catch(function (err) {
        reject(err);
      });
    });

    // Use timeout to create on the next click, after we start listening to the updates
    return sporks.timeout().then(function () {
      return slouch.doc.create(utils.createdDB, {
        foo: 'bar'
      });
    }).then(function () {
      return promise;
    });
  });

  it('should listen for updates no history when couchdb 2', function () {
    fakeCouchDBVersion('2');

    // Mock get regardless of version of CouchDB
    var defaultGet = db.get;
    db.get = function (name) {
      var args = sporks.toArgsArray(arguments);
      if (name === '_global_changes') {
        args[0] = utils.createdDB;
      }
      return defaultGet.apply(this, args);
    };

    // Mock changes regardless of version of CouchDB
    var defaultChanges = db.changes;
    db.changes = function (name) {
      var args = sporks.toArgsArray(arguments);
      if (name === '_global_changes') {
        args[0] = utils.createdDB;
      }
      return defaultChanges.apply(this, args);
    };

    var promise = new Promise(function (resolve, reject) {
      iteratorToAbort = system.updatesNoHistory({
        feed: 'continuous'
      });

      iteratorToAbort.each(function (update) {
        if (update.db_name === utils.createdDB && update.type === 'updated') {
          resolve();
        }
      }).catch(function (err) {
        reject(err);
      });
    });

    // Use timeout to create on the next click, after we start listening to the updates
    return sporks.timeout().then(function () {
      return slouch.doc.create(utils.createdDB, {
        _id: 'updated:' + utils.createdDB
      });
    }).then(function () {
      return promise;
    });
  });

  it('should clone params', function () {
    var params = {
      foo: 'bar'
    };
    system._cloneParams(params).should.eql(params);
  });

  it('should return undefined if item missing id', function () {
    (system._itemToUpdate({}) === undefined).should.eql(true);
  });

});
