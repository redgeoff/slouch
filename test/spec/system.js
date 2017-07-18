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
    defaultGet = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    system = slouch.system;
    destroyed = [];
    created = [];
    return utils.createDB();
  });

  afterEach(function () {
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

  var isPhantomJS = function () {
    return global.navigator && global.navigator.userAgent.indexOf('PhantomJS') !== -1;
  };

  // TODO: why do continuous requests just hang in PhantomJS, but not in any other browser?
  var fakeContinuousUpdatesIfPhantomJS = function () {
    if (isPhantomJS()) {
      system.updates = function () {
        return new FakedStreamIterator([{
          db_name: utils.createdDB,
          type: 'updated'
        }]);
      };

      system.updatesNoHistory = system.updates;
    }
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

  it('should reset when not couchdb', function () {
    fakeCouchDBVersion('2');
    fakeDBAll(['_replicator', '_global_changes', '_users', 'testa', 'testb']);
    fakeCreateAndDestroy();

    return system.reset().then(function () {
      created.should.eql(['_replicator', '_global_changes', '_users']);
      destroyed.should.eql(['_replicator', '_global_changes', '_users', 'testa',
        'testb'
      ]);
    });
  });

  it('should listen for updates', function () {
    var hasUpdate = false;
    return slouch.doc.create(utils.createdDB, {
      foo: 'bar'
    }).then(function () {
      return system.updates().each(function (update) {
        if (update.db_name === utils.createdDB) {
          hasUpdate = true;
        }
      });
    }).then(function () {
      hasUpdate.should.eql(true);
    });
  });

  it('should listen for updates continuously', function () {
    fakeContinuousUpdatesIfPhantomJS();

    var promise = new Promise(function (resolve, reject) {
      system.updates({
        feed: 'continuous'
      }).each(function (update) {
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
    fakeContinuousUpdatesIfPhantomJS();

    var promise = new Promise(function (resolve, reject) {
      system.updatesNoHistory({
        feed: 'continuous'
      }).each(function (update) {
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
    fakeContinuousUpdatesIfPhantomJS();

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
      system.updatesNoHistory({
        feed: 'continuous'
      }).each(function (update) {
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

});
