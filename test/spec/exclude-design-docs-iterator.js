'use strict';

var DB = require('../../scripts').DB,
  ExcludeDesignDocsIterator = require('../../scripts').ExcludeDesignDocsIterator,
  utils = require('../utils');

describe('exclude-design-docs-iterator', function () {

  var db = new DB(utils.couchDBURL());

  beforeEach(function () {
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  var createDocs = function () {
    return db.postDoc('testdb', {
      thing: 'play'
    }).then(function () {
      return db.postDoc('testdb', {
        thing: 'write'
      });
    }).then(function () {
      return db.postDoc('testdb', {
        _id: '_design/mydesign',
        thing: 'design'
      });
    });
  };

  it('should filter', function () {
    var docs = [];
    return createDocs().then(function () {
      return new ExcludeDesignDocsIterator(db.allDocsIterator('testdb', {
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
