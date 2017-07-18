'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('exclude-design-docs-iterator', function () {

  var slouch = new Slouch(utils.couchDBURL());

  beforeEach(function () {
    return utils.createDB();
  });

  afterEach(function () {
    return utils.destroyDB();
  });

  var createDocs = function () {
    return slouch.doc.create(utils.createdDB, {
      thing: 'play'
    }).then(function () {
      return slouch.doc.create(utils.createdDB, {
        thing: 'write'
      });
    }).then(function () {
      return slouch.doc.create(utils.createdDB, {
        _id: '_design/mydesign',
        thing: 'design'
      });
    });
  };

  it('should filter', function () {
    var docs = [];
    return createDocs().then(function () {
      return new slouch.ExcludeDesignDocsIterator(slouch.doc.all(utils.createdDB, {
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
