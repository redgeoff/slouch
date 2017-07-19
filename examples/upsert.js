'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://admin:admin@localhost:5984');

// Create the database
slouch.db.create('mydb').then(function () {

  // Create a doc
  return slouch.doc.create('mydb', { _id: '1', foo: 'bar' });

}).then(function (doc) {

  // Update the doc
  return slouch.doc.upsert('mydb', { _id: '1', foo: 'yar' });

}).then(function () {

  // Destroy the database
  return slouch.db.destroy('mydb');

}).then(function () {

  // Database was destroyed

});
