'use strict';

var FilteredStreamIterator = require('quelle').FilteredStreamIterator,
  inherits = require('inherits');

var ExcludeDesignDocsIterator = function (iterator) {
  FilteredStreamIterator.apply(this, [iterator, function (doc) {
    return doc.id.indexOf('_design') === -1 ? doc : undefined; // exclude design docs
  }]);
};

inherits(ExcludeDesignDocsIterator, FilteredStreamIterator);

module.exports = ExcludeDesignDocsIterator;
