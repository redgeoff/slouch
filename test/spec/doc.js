'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise'),
  config = require('../config.json');

describe('doc', function () {

  var slouch = null,
    db = null,
    defaultGet = null,
    defaultUpdate = null,
    conflictDoc = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    return utils.createDB();
  });

  afterEach(function () {
    return utils.destroyDB();
  });

  var createDocs = function () {
    return slouch.doc.create(utils.createdDB, {
      _id: '1',
      thing: 'jam'
    }).then(function () {
      return slouch.doc.create(utils.createdDB, {
        thing: 'clean',
        fun: false
      });
    }).then(function () {
      return slouch.doc.create(utils.createdDB, {
        thing: 'code'
      });
    });
  };

  var fakeConflict = function (numConflicts) {

    defaultUpdate = slouch.doc.update;

    var i = 0;

    // Fake resolution of conflict
    slouch.doc.update = function () {
      if (numConflicts && i++ > numConflicts) {
        // Resolve after a few attempts
        slouch.doc.get = defaultGet;
      }
      return defaultUpdate.apply(this, arguments);
    };

    return createDocs().then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {

      conflictDoc = doc;

      return slouch.doc.createOrUpdate(utils.createdDB, {
        _id: '1',
        thing: 'dance'
      }).then(function () {

        defaultGet = slouch.doc.get;

        // Fake conflict
        slouch.doc.get = function () {
          return Promise.resolve({
            _id: '1',
            _rev: doc._rev,
            thing: 'dance'
          });
        };

      });

    });
  };

  it('should create, update and get doc', function () {
    var doc = {
      thing: 'play'
    };

    return slouch.doc.create(utils.createdDB, doc).then(function (_doc) {
      doc._id = _doc.id;
      return slouch.doc.get(utils.createdDB, doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      doc.priority = 'medium';
      return slouch.doc.update(utils.createdDB, doc);
    }).then(function () {
      return slouch.doc.get(utils.createdDB, doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      body.should.eql(doc);
    });
  });

  it('should destroy all non-design docs', function () {
    return slouch.doc.create(utils.createdDB, {
      thing: 'play'
    }).then(function () {
      return slouch.doc.create(utils.createdDB, {
        thing: 'write'
      });
    }).then(function () {
      return slouch.doc.create(utils.createdDB, {
        _id: '_design/mydesign',
        foo: 'bar'
      });
    }).then(function () {
      return slouch.doc.destroyAllNonDesign(utils.createdDB);
    }).then(function () {
      return slouch.doc.allArray(utils.createdDB);
    }).then(function (body) {
      body.total_rows.should.eql(1);
    });
  });

  it('should throw when conflict', function () {
    return sporks.shouldThrow(function () {
      var doc = {
        thing: 'play'
      };
      return slouch.doc.create(utils.createdDB, doc).then(function (_doc) {
        doc._id = _doc.id;
        doc.priority = 'medium';
        // Generates conflict as no rev provided
        return slouch.doc.update(utils.createdDB, doc);
      });
    });
  });

  it('should ignore conflict when updateting', function () {
    return slouch.doc.create(utils.createdDB, {
      _id: '1',
      thing: 'jam'
    }).then(function () {
      return slouch.doc.updateIgnoreConflict(utils.createdDB, {
        _id: '1',
        thing: 'clean'
      });
    });
  });

  it('should only ignore conflicts', function () {
    return sporks.shouldThrow(function () {
      return slouch.doc.updateIgnoreConflict('missingdb', {
        thing: 'clean'
      });
    });
  });

  it('should ignore missing docs', function () {
    return slouch.doc.getIgnoreMissing(utils.createdDB, 'missingid');
  });

  it('should check if doc exists', function () {
    return createDocs().then(function () {
      return slouch.doc.exists(utils.createdDB, '1');
    }).then(function (exists) {
      exists.should.eql(true);
    });
  });

  it('should throw if not missing', function () {
    return sporks.shouldThrow(function () {
      return slouch.doc.ignoreMissing(function () {
        return sporks.promiseError(new Error());
      });
    });
  });

  it('should create and ignore conflict', function () {
    return fakeConflict().then(function () {
      return slouch.doc.createAndIgnoreConflict(utils.createdDB, {
        _id: '1',
        thing: 'dance'
      });
    });
  });

  it('should create when creating or updating', function () {
    return slouch.doc.createOrUpdate(utils.createdDB, {
      _id: '1',
      thing: 'jam'
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('jam');
    });
  });

  it('should update when creating or updating', function () {
    return createDocs().then(function () {
      return slouch.doc.createOrUpdate(utils.createdDB, {
        _id: '1',
        thing: 'dance'
      });
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('dance');
    });
  });

  it('should throw when creating or updating', function () {
    return fakeConflict().then(function () {
      return sporks.shouldThrow(function () {
        return slouch.doc.createOrUpdate(utils.createdDB, {
          _id: '1',
          thing: 'jam'
        });
      });
    });
  });

  it('should ignore conflict when creating or updating', function () {
    return fakeConflict().then(function () {
      return slouch.doc.createOrUpdateIgnoreConflict(utils.createdDB, {
        _id: '1',
        thing: 'sing'
      });
    });
  });

  it('should upsert when conflict', function () {
    return fakeConflict(3).then(function () {
      return slouch.doc.upsert(utils.createdDB, {
        _id: '1',
        thing: 'dance'
      });
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('dance');
    });
  });

  it('upsert should fail after max retries', function () {
    slouch.maxRetries = 3;

    return fakeConflict().then(function () {
      return sporks.shouldThrow(function () {
        return slouch.doc.upsert(utils.createdDB, {
          _id: '1',
          thing: 'dance'
        });
      });
    });
  });

  it('should get, merge and update', function () {
    return createDocs().then(function () {
      return slouch.doc.getMergeUpdate(utils.createdDB, {
        _id: '1',
        priority: 'high'
      });
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('jam');
      doc.priority.should.eql('high');
    });
  });

  it('should get, merge, create or update when doc existing', function () {
    return createDocs().then(function () {
      return slouch.doc.getMergeCreateOrUpdate(utils.createdDB, {
        _id: '1',
        priority: 'high'
      });
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('jam');
      doc.priority.should.eql('high');
    });
  });

  it('should get, merge, create or update when missing', function () {
    return slouch.doc.getMergeCreateOrUpdate(utils.createdDB, {
      _id: '1',
      priority: 'high'
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.priority.should.eql('high');
    });
  });

  it('should ignore conflict when getting, merging and updating', function () {
    return fakeConflict().then(function () {
      return slouch.doc.getMergeUpdateIgnoreConflict(utils.createdDB, {
        _id: '1',
        thing: 'sing'
      });
    });
  });

  it('should get, merge and upsert when conflict', function () {
    return fakeConflict(3).then(function () {
      return slouch.doc.getMergeUpsert(utils.createdDB, {
        _id: '1',
        priority: 'high'
      });
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('dance');
      doc.priority.should.eql('high');
    });
  });

  it('get, merge and upsert should fail after max retries', function () {
    slouch.maxRetries = 3;

    return fakeConflict().then(function () {
      return sporks.shouldThrow(function () {
        return slouch.doc.getMergeUpsert(utils.createdDB, {
          _id: '1',
          thing: 'dance'
        });
      });
    });
  });

  it('should get, modify and upsert when conflict', function () {
    return fakeConflict(3).then(function () {
      return slouch.doc.getModifyUpsert(utils.createdDB, '1', function (doc) {
        return Promise.resolve({
          _id: '1',
          _rev: doc._rev,
          thing: doc.thing,
          priority: 'high'
        });
      });
    }).then(function () {
      return slouch.doc.get(utils.createdDB, '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('dance');
      doc.priority.should.eql('high');
    });
  });

  it('get, modify and upsert should fail after max retries', function () {
    slouch.maxRetries = 3;

    return fakeConflict().then(function () {
      return sporks.shouldThrow(function () {
        return slouch.doc.getModifyUpsert(utils.createdDB, '1', function (doc) {
          return Promise.resolve({
            _id: '1',
            _rev: doc._rev,
            thing: doc.thing,
            priority: 'high'
          });
        });
      });
    });
  });

  it('should ignore conflicts when destroying', function () {
    return fakeConflict().then(function () {
      return slouch.doc.destroyIgnoreConflict(utils.createdDB, '1', conflictDoc._rev);
    });
  });

  it('should get and destroy', function () {
    return createDocs().then(function () {
      return slouch.doc.getAndDestroy(utils.createdDB, '1');
    }).then(function () {
      return slouch.doc.exists();
    }).then(function (exists) {
      exists.should.eql(false);
    });
  });

  it('should mark as destroyed', function () {
    return createDocs().then(function () {
      return slouch.doc.markAsDestroyed(utils.createdDB, '1');
    }).then(function () {
      return slouch.doc.exists();
    }).then(function (exists) {
      exists.should.eql(false);
    });
  });

  it('should set destroyed', function () {
    var doc = {};
    slouch.doc.setDestroyed(doc);
    doc._deleted.should.eql(true);
  });

  it('all should throw when permissions error', function () {
    var badAuthURL = config.couchdb.scheme + '://baduser:badpassord@' + config.couchdb.host +
      ':' + config.couchdb.port,
      slouch2 = new Slouch(badAuthURL),
      readItem = false;
    return sporks.shouldThrow(function () {
      return slouch2.doc.all(utils.createdDB).each(function ( /* doc */ ) {
        readItem = true;
      });
    }).then(function () {
      readItem.should.eql(false);
    });
  });

});
