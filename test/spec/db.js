'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise');

describe('db', function () {

  var slouch = null,
    db = null,
    dbsToDestroy = ['testdb'];

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    return db.create('testdb');
  });

  afterEach(function () {
    var promises = [];
    dbsToDestroy.forEach(function (name) {
      promises.push(db.destroy(name));
    });
    return Promise.all(promises);
  });

  var createDocs = function () {
    return slouch.doc.post('testdb', {
      thing: 'jam'
    }).then(function () {
      return slouch.doc.post('testdb', {
        thing: 'clean',
        fun: false
      });
    }).then(function () {
      return slouch.doc.post('testdb', {
        thing: 'code'
      });
    });
  };

  var createView = function () {
    return slouch.doc.post('testdb', {
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

    return db.create('testdb');
  });

  it('should get db', function () {
    return db.get('testdb').then(function (_db) {
      _db.db_name.should.eql('testdb');
    });
  });

  it('should get changes', function () {
    var changes = {};
    return createDocs().then(function () {
      return db.changes('testdb', {
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

  it('should get view', function () {
    var docs = {};
    return createDocs().then(function () {
      return createView();
    }).then(function () {
      return db.view('testdb', '_design/myview', 'fun', {
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
      return db.viewArray('testdb', '_design/myview', 'fun', {
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
      return db.create('testdb2');
    }).then(function () {
      dbsToDestroy.push('testdb2');
      return db.replicate({
        source: slouch._url + '/testdb',
        target: slouch._url + '/testdb2'
      });
    }).then(function () {
      return verifyAllDocs('testdb2');
    });
  });

  it('should copy', function () {
    return createDocs().then(function () {
      return db.create('testdb2');
    }).then(function () {
      return db.copy('testdb', 'testdb2');
    }).then(function () {
      return verifyAllDocs('testdb2');
    });
  });

});
