'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://admin:admin@localhost:5984');

var i = 0;
var MAX_ITEMS = 100;

var iterator = slouch.db.changes('_global_changes', { include_docs: true, feed: 'continuous' });

iterator.each(function (item) {

  // Abort after MAX_ITEMS are read. Note: this logic is used to illustrate the iterator.abort()
  // feature, but a real-world example, would probably just use the `limit` option when making the
  // call to changes.
  if (++i === MAX_ITEMS) {
    iterator.abort();
  }

  console.log('item=', item);

  // If we return a promise then the changes() iterator won't move on to the next item until the
  // promise resolves. This allows us to process a iterate through a large number of docs without
  // consuming a lot of memory loading all the docs into memory. It also allows us to control the
  // flow of the items and process them sequentially so that we don't end up thrashing the
  // processor with concurrent processes.
  return Promise.resolve();

}).then(function () {

  // Done iterating through change docs

});
