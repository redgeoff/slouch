'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks');

describe('doc', function () {

  var slouch = new Slouch(utils.couchDBURL()),
    db = slouch.db;

  beforeEach(function () {
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  it('should post, put and get doc', function () {
    var doc = {
      thing: 'play'
    };

    return slouch.doc.post('testdb', doc).then(function (_doc) {
      doc._id = _doc.id;
      return slouch.doc.get('testdb', doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      doc.priority = 'medium';
      return slouch.doc.put('testdb', doc);
    }).then(function () {
      return slouch.doc.get('testdb', doc._id);
    }).then(function (body) {
      doc._rev = body._rev;
      body.should.eql(doc);
    });
  });

  it('should destroy all non-design docs', function () {
    return slouch.doc.post('testdb', {
      thing: 'play'
    }).then(function () {
      return slouch.doc.post('testdb', {
        thing: 'write'
      });
    }).then(function () {
      return slouch.doc.post('testdb', {
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
      return slouch.doc.post('testdb', doc).then(function (_doc) {
        doc._id = _doc.id;
        doc.priority = 'medium';
        // Generates conflict as no rev provided
        return slouch.doc.put('testdb', doc);
      });
    });
  });

});
