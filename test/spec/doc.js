'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise');

describe('doc', function () {

  var slouch = null,
    db = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  var createDocs = function () {
    return slouch.doc.create('testdb', {
      _id: '1',
      thing: 'jam'
    }).then(function () {
      return slouch.doc.create('testdb', {
        thing: 'clean',
        fun: false
      });
    }).then(function () {
      return slouch.doc.create('testdb', {
        thing: 'code'
      });
    });
  };

  var defaultGet = null;

  var fakeConflict = function () {
    return createDocs().then(function () {
      return slouch.doc.get('testdb', '1');
    }).then(function (doc) {

      return slouch.doc.createOrUpdate('testdb', {
        _id: '1',
        thing: 'dance'
      }).then(function () {

        defaultGet = slouch.doc.get;

        // Fake conflict
        slouch.doc.get = function () {
          return Promise.resolve({
            _rev: doc._rev
          });
        };

      });

    });
  };

  it('should create, update and get doc', function () {
    var doc = {
      thing: 'play'
    };

    return slouch.doc.create('testdb', doc).then(function (_doc) {
      doc._id = _doc.id;
      return slouch.doc.get('testdb', doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      doc.priority = 'medium';
      return slouch.doc.update('testdb', doc);
    }).then(function () {
      return slouch.doc.get('testdb', doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      body.should.eql(doc);
    });
  });

  it('should destroy all non-design docs', function () {
    return slouch.doc.create('testdb', {
      thing: 'play'
    }).then(function () {
      return slouch.doc.create('testdb', {
        thing: 'write'
      });
    }).then(function () {
      return slouch.doc.create('testdb', {
        _id: '_design/mydesign',
        foo: 'bar'
      });
    }).then(function () {
      return slouch.doc.destroyAllNonDesign('testdb');
    }).then(function () {
      return slouch.doc.allArray('testdb');
    }).then(function (body) {
      body.total_rows.should.eql(1);
    });
  });

  it('should throw when conflict', function () {
    return sporks.shouldThrow(function () {
      var doc = {
        thing: 'play'
      };
      return slouch.doc.create('testdb', doc).then(function (_doc) {
        doc._id = _doc.id;
        doc.priority = 'medium';
        // Generates conflict as no rev provided
        return slouch.doc.update('testdb', doc);
      });
    });
  });

  it('should ignore conflict when updateting', function () {
    return slouch.doc.create('testdb', {
      _id: '1',
      thing: 'jam'
    }).then(function () {
      return slouch.doc.updateIgnoreConflict('testdb', {
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
    return slouch.doc.getIgnoreMissing('testdb', 'missingid');
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
      return slouch.doc.createAndIgnoreConflict('testdb', {
        _id: '1',
        thing: 'dance'
      });
    });
  });

  it('should create when creating or updating', function () {
    return slouch.doc.createOrUpdate('testdb', {
      _id: '1',
      thing: 'jam'
    }).then(function () {
      return slouch.doc.get('testdb', '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('jam');
    });
  });

  it('should update when creating or updating', function () {
    return createDocs().then(function () {
      return slouch.doc.createOrUpdate('testdb', {
        _id: '1',
        thing: 'dance'
      });
    }).then(function () {
      return slouch.doc.get('testdb', '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('dance');
    });
  });

  it('should throw when creating or updating', function () {
    // Fake error
    slouch.doc.get = function () {
      return Promise.resolve({
        _rev: 'bad-rev'
      });
    };

    return createDocs().then(function () {
      return sporks.shouldThrow(function () {
        return slouch.doc.createOrUpdate('testdb', {
          _id: '1',
          thing: 'jam'
        });
      });
    });
  });

  it('should should ignore conflict when creating or updating', function () {
    return fakeConflict().then(function () {
      return slouch.doc.createOrUpdateIgnoreConflict('testdb', {
        _id: '1',
        thing: 'sing'
      });
    });
  });

  it('should upsert when conflict', function () {
    var i = 0,
      defaultCreateOrUpdate = slouch.doc.createOrUpdate;

    // Fake resolution of conflict
    slouch.doc.createOrUpdate = function () {
      if (i++ > 3) {
        // Resolve after a few attempts
        slouch.doc.get = defaultGet;
      }
      return defaultCreateOrUpdate.apply(this, arguments);
    };

    return fakeConflict().then(function () {
      return slouch.doc.upsert('testdb', {
        _id: '1',
        thing: 'dance'
      });
    }).then(function () {
      return slouch.doc.get('testdb', '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('dance');
    });
  });

  it('upsert should fail after max retries', function () {
    slouch.maxRetries = 3;

    return fakeConflict().then(function () {
      return sporks.shouldThrow(function () {
        return slouch.doc.upsert('testdb', {
          _id: '1',
          thing: 'dance'
        });
      });
    });
  });

  it('should get, merge and update', function () {
    return createDocs().then(function () {
      return slouch.doc.getMergeUpdate('testdb', {
        _id: '1',
        priority: 'high'
      });
    }).then(function () {
      return slouch.doc.get('testdb', '1');
    }).then(function (doc) {
      doc._id.should.eql('1');
      doc.thing.should.eql('jam');
      doc.priority.should.eql('high');
    });
  });

});
