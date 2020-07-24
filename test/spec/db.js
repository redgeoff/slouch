'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise'),
  config = require('../config.json');

describe('db', function () {

  var slouch = null,
    db = null,
    dbsToDestroy = null,
    changes = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    dbsToDestroy = [];
    return utils.createDB().then(function () {
      dbsToDestroy.push(utils.createdDB);
    });
  });

  afterEach(function () {
    var promises = [];
    dbsToDestroy.forEach(function (name) {
      promises.push(db.destroy(name));
    });
    return Promise.all(promises);
  });

  var jam = function (dbName) {
    return slouch.doc.create(dbName || utils.createdDB, {
      thing: 'jam'
    });
  };

  var clean = function (dbName) {
    return slouch.doc.create(dbName || utils.createdDB, {
      thing: 'clean',
      fun: false
    });
  };

  var code = function (dbName) {
    return slouch.doc.create(dbName || utils.createdDB, {
      thing: 'code'
    });
  };

  var createDocs = function (dbName) {
    return jam(dbName).then(function () {
      return clean(dbName);
    }).then(function () {
      return code(dbName);
    });
  };

  var createView = function (dbName, docId) {
    return slouch.doc.create(dbName || utils.createdDB, {
      _id: docId || '_design/myview',
      views: {
        fun: {
          map: [
            'function(doc) {',
            'if (doc.fun !== false) {',
            'emit(doc._id, null);',
            '}',
            '}'
          ].join(' ')
        }
      }
    });
  };

  var verifyAllDocs = function (dbName) {
    var docs = {};
    return slouch.doc.all(dbName, {
      include_docs: true
    }).each(function (doc) {
      docs[doc.doc.thing] = true;
    }).then(function () {
      docs.should.eql({
        jam: true,
        clean: true,
        code: true
      });
    });
  };

  it('should check if exists', function () {
    return db.exists(utils.createdDB).then(function (exists) {
      exists.should.eql(true);
    }).then(function () {
      return db.exists(utils.createdDB + '_2');
    }).then(function (exists) {
      exists.should.eql(false);
    });
  });

  it('should create partitioned database if supported', function () {
    return slouch.system.supportPartitioned().then(function (partitioned) {
      if (partitioned) {
        return db.create('p' + utils.createdDB, {
          partitioned: true
        }).then(function () {
          dbsToDestroy.push('p' + utils.createdDB);
          return db.isPartitioned('p' + utils.createdDB).then(function (partitioned) {
            partitioned.should.eql(true);
          });
        });
      } else {
        return db.create('p' + utils.createdDB).then(function () {
          dbsToDestroy.push('p' + utils.createdDB);
          return db.isPartitioned('p' + utils.createdDB).then(function (partitioned) {
            partitioned.should.eql(false);
          });
        });
      }
    });
  });

  it('should iterate through dbs', function () {
    var dbNames = [];

    return db.all().each(function (db) {
      dbNames.push(db);
    }).then(function () {
      // Make sure db names were captured
      dbNames.should.not.have.lengthOf(0, 'db names were not captured');

      // Make sure a specific DB like _users was captured
      var usersFound = false;
      dbNames.forEach(function (dbName) {
        if (dbName === '_users') {
          usersFound = true;
        }
      });
      usersFound.should.eql(true, 'A specific DB like _users was not captured');
    });
  });

  it('all should throw when permissions error', function () {
    var badAuthURL = config.couchdb.scheme + '://baduser:badpassord@' + config.couchdb.host +
      ':' + config.couchdb.port,
      slouch2 = new Slouch(badAuthURL),
      readItem = false;
    return sporks.shouldThrow(function () {
      return slouch2.db.all().each(function ( /* db */ ) {
        readItem = true;
      });
    }).then(function () {
      readItem.should.eql(false);
    });
  });

  it('create should not throw if DB is created', function () {
    var err = new Error();

    // Fake error
    db._create = function () {
      return sporks.promiseError(err);
    };

    return sporks.shouldThrow(function () {
      return db.create('missing-db');
    }, err);
  });

  it('create should throw if DB is not created', function () {
    var err = new Error();

    // Fake error
    db._create = function () {
      return sporks.promiseError(err);
    };

    return utils.createDB();
  });

  it('should get db', function () {
    return db.get(utils.createdDB).then(function (_db) {
      _db.db_name.should.eql(utils.createdDB);
    });
  });

  it('should get changes', function () {
    var changes = {};
    return createDocs().then(function () {
      return db.changes(utils.createdDB, {
        include_docs: true
      }).each(function (change) {
        // Use associative array as order is not guaranteed
        changes[change.doc.thing] = true;
      });
    }).then(function () {
      changes.should.eql({
        jam: true,
        clean: true,
        code: true
      });
    });
  });

  it('should get changes with a selector', function () {
    var changes = {};
    return createDocs().then(function () {
      return db.changes(utils.createdDB, {
        include_docs: true
      }, {
        selector: {
          thing: 'jam'
        }
      }).each(function (change) {
        // Use associative array as order is not guaranteed
        changes[change.doc.thing] = true;
      });
    }).then(function () {
      changes.should.eql({
        jam: true
      });
    });
  });

  it('should get no changes with an unknown selector', function () {
    var changes = {};
    return createDocs().then(function () {
      return db.changes(utils.createdDB, {
        include_docs: true
      }, {
        selector: {
          thing: 'does-not-exist'
        }
      }).each(function (change) {
        // Use associative array as order is not guaranteed
        changes[change.doc.thing] = true;
      });
    }).then(function () {
      changes.should.eql({});
    });
  });


  it('should get changes array', function () {
    var indexedChanges = {};
    return createDocs().then(function () {
      return db.changesArray(utils.createdDB, {
        include_docs: true
      });
    }).then(function (changes) {
      // Order of changes not guaranteed so we will index the values for easy comparison
      changes.results.forEach(function (change) {
        indexedChanges[change.doc.thing] = true;
      });

      indexedChanges.should.eql({
        jam: true,
        clean: true,
        code: true
      });
    });
  });

  it('should get changes array with a selector', function () {
    var indexedChanges = {};
    return createDocs().then(function () {
      return db.changesArray(utils.createdDB, {
        include_docs: true
      }, {
        selector: {
          thing: 'jam'
        }
      });
    }).then(function (changes) {
      // Order of changes not guaranteed so we will index the values for easy comparison
      changes.results.forEach(function (change) {
        indexedChanges[change.doc.thing] = true;
      });

      indexedChanges.should.eql({
        jam: true
      });
    });
  });

  it('should get no changes array with a unknown selector', function () {
    var indexedChanges = {};
    return createDocs().then(function () {
      return db.changesArray(utils.createdDB, {
        include_docs: true
      }, {
        selector: {
          thing: 'does-not-exist'
        }
      });
    }).then(function (changes) {
      // Order of changes not guaranteed so we will index the values for easy comparison
      changes.results.forEach(function (change) {
        indexedChanges[change.doc.thing] = true;
      });

      indexedChanges.should.eql({});
    });
  });


  var waitForChange = function (thing) {
    return sporks.waitFor(function () {
      return changes[thing];
    });
  };

  it('should resume changes', function () {
    changes = {};

    var changesIterator = db.changes(utils.createdDB, {
      include_docs: true,
      feed: 'continuous',
      heartbeat: true
    });

    var changesPromise = changesIterator.each(function (change) {
      // Use associative array as order is not guaranteed
      if (!changes[change.doc.thing]) {
        changes[change.doc.thing] = 0;
      }
      changes[change.doc.thing]++;
    });

    // Create "jam" doc
    var mainPromise = jam().then(function () {
      return waitForChange('jam');
    }).then(function () {
      // Simulate dropped connection
      var err = new Error();
      err.code = 'ETIMEDOUT';
      changesIterator._streamIterator._lastRequest.emit('error', err);
    }).then(function () {
      // Create "code" doc
      return code();
    }).then(function () {
      // Wait for "code" to be read in changes feed
      return waitForChange('code');
    }).then(function () {
      // Shut down iterator
      changesIterator.abort();
    }).then(function () {
      // Make sure we only read each change once, i.e. the reconnect resumed reading after "jam"
      changes.should.eql({
        jam: 1,
        code: 1
      });
    });

    return Promise.all([changesPromise, mainPromise]);
  });

  it('changes should force reconnect', function () {

    // Force a reconnect after each item
    slouch.forceReconnectAfterMilliseconds = 1000;

    changes = {};

    var changesIterator = db.changes(utils.createdDB, {
      include_docs: true,
      feed: 'continuous',
      heartbeat: 10
    });

    var connections = 0;
    changesIterator.on('connect', function () {
      connections++;
    });

    var changesPromise = changesIterator.each(function (change) {
      // Use associative array as order is not guaranteed
      if (!changes[change.doc.thing]) {
        changes[change.doc.thing] = 0;
      }
      changes[change.doc.thing]++;
    });

    var mainPromise = jam().then(function () {
      return sporks.timeout(100);
    }).then(function () {
      return waitForChange('jam');
    }).then(function () {
      // Wait for reconnection
      return sporks.waitFor(function () {
        return connections > 0 ? true : undefined;
      });
    }).then(function () {
      return code();
    }).then(function () {
      return waitForChange('code');
    }).then(function () {
      // Shut down iterator
      changesIterator.abort();
    }).then(function () {
      // Make sure we only read each change once, i.e. the reconnects resumed reading
      changes.should.eql({
        jam: 1,
        code: 1
      });

      // Make sure there were multiple connections
      connections.should.be.above(0);
    });

    return Promise.all([changesPromise, mainPromise]);
  });

  it('should set since', function () {
    // Needed for 100% code coverage in PhantomJS
    var lastSeq = '1',
      opts = {
        qs: {}
      };
    db._setSince(opts, lastSeq);
    opts.qs.since.should.eql(lastSeq);
  });

  it('should get view', function () {
    var docs = {};
    return createDocs().then(function () {
      return createView();
    }).then(function () {
      return db.view(utils.createdDB, '_design/myview', 'fun', {
        include_docs: true
      }).each(function (doc) {
        // Use associative array as order is not guaranteed
        docs[doc.doc.thing] = true;
      });
    }).then(function () {
      docs.should.eql({
        jam: true,
        code: true
      });
    });
  });

  it('should get view array', function () {
    var docs = {};
    return createDocs().then(function () {
      return createView();
    }).then(function () {
      return db.viewArray(utils.createdDB, '_design/myview', 'fun', {
        include_docs: true
      }).then(function (_docs) {
        _docs.rows.forEach(function (_doc) {
          // Use associative array as order is not guaranteed
          docs[_doc.doc.thing] = true;
        });
      });
    }).then(function () {
      docs.should.eql({
        jam: true,
        code: true
      });
    });
  });

  it('should replicate', function () {
    return createDocs().then(function () {
      return db.create(utils.createdDB + '_2');
    }).then(function () {
      dbsToDestroy.push(utils.createdDB + '_2');
      return db.replicate({
        source: slouch._url + '/' + encodeURIComponent(utils.createdDB),
        target: slouch._url + '/' + encodeURIComponent(utils.createdDB) + '_2'
      });
    }).then(function () {
      return verifyAllDocs(utils.createdDB + '_2');
    });
  });

  it('should copy', function () {
    return createDocs().then(function () {
      return db.create(utils.createdDB + '_2');
    }).then(function () {
      dbsToDestroy.push(utils.createdDB + '_2');
      return db.copy(utils.createdDB, utils.createdDB + '_2');
    }).then(function () {
      return verifyAllDocs(utils.createdDB + '_2');
    });
  });

  it('show create db with slash in name', function () {
    var dbName = this.createdDB + '/test';
    return db.create(dbName)
      .then(function () {
        dbsToDestroy.push(dbName);
        return db.exists(dbName);
      })
      .then(function (exists) {
        exists.should.eql(true);
      });
  });

  it('show get a db with slash in name', function () {
    var dbName = this.createdDB + '/test';
    return db.create(dbName)
      .then(function () {
        dbsToDestroy.push(dbName);
        return db.get(dbName);
      })
      .then(function (_db) {
        _db.db_name.should.eql(dbName);
      });
  });

  it('should get view with slash in id', function () {
    var docs = {};
    var dbName = db.createdDB + '/test';
    var viewDocId = '_design/my/view';
    return db.create(dbName)
      .then(function () {
        dbsToDestroy.push(dbName);
        return createDocs(dbName);
      })
      .then(function () {
        return createView(dbName, viewDocId);
      }).then(function () {
        return db.view(dbName, viewDocId, 'fun', {
          include_docs: true
        }).each(function (doc) {
          // Use associative array as order is not guaranteed
          docs[doc.doc.thing] = true;
        });
      }).then(function () {
        docs.should.eql({
          jam: true,
          code: true
        });
      });
  });

  it('should get view array with slash in name', function () {
    var docs = {};
    var dbName = db.createdDB + '/test';
    var viewDocId = '_design/my/view';
    return db.create(dbName)
      .then(function () {
        dbsToDestroy.push(dbName);
        return createDocs(dbName);
      })
      .then(function () {
        return createView(dbName, viewDocId);
      }).then(function () {
        return db.viewArray(dbName, viewDocId, 'fun', {
          include_docs: true
        }).then(function (_docs) {
          _docs.rows.forEach(function (_doc) {
            // Use associative array as order is not guaranteed
            docs[_doc.doc.thing] = true;
          });
        });
      }).then(function () {
        docs.should.eql({
          jam: true,
          code: true
        });
      });
  });
});
