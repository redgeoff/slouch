'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://admin:admin@localhost:5984');

// Create the database
slouch.db.create('mydb').then(function () {

  // Create a doc
  return slouch.doc.create('mydb', { _id: '1', foo: 'bar' });

}).then(function (doc) {

  // Add the `yar` attr to the doc via a callback and ignore any conflicts
  return slouch.doc.getModifyUpsert('mydb', '1', function (doc) {

    doc.yar = (new Date()).getTime();

    return doc;

  });

}).then(function () {

  // Destroy the database
  return slouch.db.destroy('mydb');

}).then(function () {

  // Database was destroyed

});
