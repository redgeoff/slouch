'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://admin:admin@localhost:5984');

var Throttler = require('squadron').Throttler;
var throttler = new Throttler(5);

// Create the database
slouch.db.create('mydb').then(function () {

  // Create a doc
  return slouch.doc.create('mydb', { foo: 'bar' });

}).then(function () {

  // Create another doc
  return slouch.doc.create('mydb', { foo: 'nar' });

}).then(function () {

  return slouch.doc.all('mydb', { include_docs: true }).each(function (item) {

    return Promise.resolve('foo => ' + item.foo);

  }, throttler).then(function () {

    // Done iterating through all docs

  });

});
