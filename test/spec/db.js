'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise'),
  config = require('../config.json');

describe('db', function () {

  var slouch = null,
    db = null,
    dbsToDestroy = null;

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

  var jam = function () {
    return slouch.doc.create(utils.createdDB, {
      thing: 'jam'
    });
  };

  var clean = function () {
    return slouch.doc.create(utils.createdDB, {
      thing: 'clean',
      fun: false
    });
  };

  var code = function () {
    return slouch.doc.create(utils.createdDB, {
      thing: 'code'
    });
  };

  var createDocs = function () {
    return jam().then(function () {
      return clean();
    }).then(function () {
      return code();
    });
  };

  var createView = function () {
    return slouch.doc.create(utils.createdDB, {
      _id: '_design/myview',
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

  // Not on PhantomJS? This test does not work on PhantomJS as PhantomJS doesn't properly support
  // simultaenous connections which means that the changes are never read.
  if (!global.window || !/PhantomJS/.test(window.navigator.userAgent)) {
    it('should resume changes', function () {

      var changes = {};

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

      var waitForChange = function (thing) {
        return sporks.waitFor(function () {
          return changes[thing];
        });
      };

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
  }

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
        source: slouch._url + '/' + utils.createdDB,
        target: slouch._url + '/' + utils.createdDB + '_2'
      });
    }).then(function () {
      return verifyAllDocs(utils.createdDB + '_2');
    });
  });

  it('should copy', function () {
    return createDocs().then(function () {
      return db.create(utils.createdDB + '_2');
    }).then(function () {
      return db.copy(utils.createdDB, utils.createdDB + '_2');
    }).then(function () {
      return verifyAllDocs(utils.createdDB + '_2');
    });
  });

});
