'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://admin:admin@localhost:5984');

// Create the database
slouch.db.create('mydb').then(function () {

  // Create a doc
  return slouch.doc.create('mydb', { foo: 'bar' });

}).then(function () {

  // Create another doc
  return slouch.doc.create('mydb', { foo: 'nar' });

}).then(function () {

  return slouch.doc.all('mydb', { include_docs: true }).each(function (item) {

    // If we return a promise then the all() iterator won't move on to the next item until the
    // promise resolves. This allows us to process a iterate through a large number of docs without
    // consuming a lot of memory loading all the docs into memory. It also allows us to control the
    // flow of the items and process them sequentially so that we don't end up thrashing the
    // processor with concurrent processes.
    return Promise.resolve('foo => ' + item.foo);

  }).then(function () {

    // Done iterating through all docs

  });

});
