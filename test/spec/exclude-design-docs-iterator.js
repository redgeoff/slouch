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
    var docs = {};
    return createDocs().then(function () {
      return new slouch.ExcludeDesignDocsIterator(slouch.doc.all(utils.createdDB, {
        include_docs: true
      })).each(function (doc) {
        // We cannot guarantee the order when our DB has multiple nodes, but this doesn't matter as
        // all we care about is that we didn't receive the design doc.
        docs[doc.doc.thing] = true;
      });
    }).then(function () {
      docs.should.eql({
        play: true,
        write: true
      });
    });
  });
});
