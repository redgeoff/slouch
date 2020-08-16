'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise'),
  config = require('../config.json');

describe('partition', function () {
  var slouch = null,
    db = null,
    system = null,
    dbsToDestroy = null,
    defaultGet = null,
    supportPartitioned = null,
    partitionId = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    system = slouch.system;
    dbsToDestroy = [];
    partitionId = 'test-partition'
  });

  afterEach(function () {
    system.get = defaultGet;
    var promises = [];
    dbsToDestroy.forEach(function (name) {
      promises.push(db.destroy(name));
    });
    return Promise.all(promises);
  });

  var fakePartitionedSupport = function () {
    defaultGet = system.get;
    system.get = function () {
      return Promise.resolve({
        features: ['partitioned']
      });
    };
  };

  it('should check if support partitioned', function () {
    // We run the tests on both CouchDB 1 and 2+ and so we don't care about the version. In the
    // future, we could pass a parameter to our test script that would allow us to test this better.
    return system.supportPartitioned().then(function (p) {
      return supportPartition = p;
    });
  });

  it('should detect partitioned support', function () {
    fakePartitionedSupport();
    return system.supportPartitioned().then(function (p) {
      p.should.eql(true);
    });
  });

  it('should cache partitioned support', function () {
    fakePartitionedSupport();
    return system.supportPartitioned().then(function () {
      return system.supportPartitioned();
    }).then(function (p) {
      p.should.eql(true);
    });
  });

  (partition ? it : it.skip)('should create partitioned database', function () {
    return utils.createDB(true).then(function () {
      dbsToDestroy.push(utils.createdDB);
      return db.isPartitioned(utils.createdDB).then(function (p) {
        p.should.eql(true);
      });
    });
  });

  (partition ? it : it.skip)('should get partitioned db', function () {
    return utils.createDB(true).then(function () {
      dbsToDestroy.push(utils.createdDB);
      return slouch.doc.create(utils.createdDB, {
        _id: partitionId + ':1',
        thing: 'jam'
      }).then(function () {
        return slouch.doc.create(utils.createdDB, {
          _id: partitionId + ':2',
          thing: 'peanut butter'
        }).then(function () {
          return slouch.doc.create(utils.createdDB, {
            _id: partitionId + 'x:1',
            thing: 'another partition'
          }).then(function () {
            return db.getPartition(utils.createdDB, partitionId).then(
              function (_db) {
                _db.db_name.should.eql(utils.createdDB);
                _db.partition.should.eql(partitionId);
                _db.doc_count.should.eql(2);
              });
          });
        });
      });
    });
  });
});
