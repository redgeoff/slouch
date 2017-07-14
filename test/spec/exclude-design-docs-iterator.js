'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('exclude-design-docs-iterator', function () {

  var slouch = new Slouch(utils.couchDBURL()),
    db = slouch.db;

  beforeEach(function () {
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  var createDocs = function () {
    return slouch.doc.post('testdb', {
      thing: 'play'
    }).then(function () {
      return slouch.doc.post('testdb', {
        thing: 'write'
      });
    }).then(function () {
      return slouch.doc.post('testdb', {
        _id: '_design/mydesign',
        thing: 'design'
      });
    });
  };

  it('should filter', function () {
    var docs = [];
    return createDocs().then(function () {
      return new slouch.ExcludeDesignDocsIterator(slouch.doc.all('testdb', {
        include_docs: true
      })).each(function (doc) {
        docs.push({
          thing: doc.doc.thing
        });
      });
    }).then(function () {
      docs.should.eql([{
        thing: 'play'
      }, {
        thing: 'write'
      }]);
    });
  });
});
