'use strict';

var DB = require('../../scripts').DB,
  utils = require('../utils'),
  sporks = require('sporks');

describe('db', function () {

  var db = new DB(utils.couchDBURL());

  beforeEach(function () {
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  it('should check if exists', function () {
    return db.exists('testdb').then(function (exists) {
      exists.should.eql(true);
    }).then(function () {
      return db.exists('testdb2');
    }).then(function (exists) {
      exists.should.eql(false);
    });
  });

  it('should set and get security', function () {
    var security = {
      'admins': {
        'names': ['joe', 'phil'],
        'roles': ['boss']
      },
      'members': {
        'names': ['dave'],
        'roles': ['producer', 'consumer']
      }
    };
    return db.setSecurity('testdb', security).then(function () {
      return db.getSecurity('testdb');
    }).then(function (_security) {
      _security.should.eql(security);
    });
  });

  it('should post, put and get doc', function () {
    var doc = {
      thing: 'play'
    };

    return db.postDoc('testdb', doc).then(function (_doc) {
      doc._id = _doc.id;
      return db.getDoc('testdb', doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      doc.priority = 'medium';
      return db.putDoc('testdb', doc);
    }).then(function () {
      return db.getDoc('testdb', doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      body.should.eql(doc);
    });
  });

  it('should destroy all non-design docs', function () {
    return db.postDoc('testdb', {
      thing: 'play'
    }).then(function () {
      return db.postDoc('testdb', {
        thing: 'write'
      });
    }).then(function () {
      return db.postDoc('testdb', {
        _id: '_design/mydesign',
        foo: 'bar'
      });
    }).then(function () {
      return db.destroyAllNonDesignDocs('testdb');
    }).then(function () {
      return db.allDocs('testdb');
    }).then(function (body) {
      body.total_rows.should.eql(1);
    });
  });

  it('should throw when conflict', function () {
    return sporks.shouldThrow(function () {
      var doc = {
        thing: 'play'
      };
      return db.postDoc('testdb', doc).then(function (_doc) {
        doc._id = _doc.id;
        doc.priority = 'medium';
        // Generates conflict as no rev provided
        return db.putDoc('testdb', doc);
      });
    });
  });

});
