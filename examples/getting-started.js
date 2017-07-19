'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://admin:admin@localhost:5984');

// Create the database
slouch.db.create('mydb').then(function () {

  // Create a doc
  return slouch.doc.create('mydb', { foo: 'bar' });

}).then(function (doc) {

  // Update the doc
  return slouch.doc.update('mydb', { _id: doc.id, _rev: doc.rev, foo: 'yar' });

}).then(function (doc) {

  // Get the doc
  return slouch.doc.get('mydb', doc._id);

}).then(function (doc) {

  // Destroy the doc
  return slouch.doc.destroy('mydb', doc._id, doc._rev);

}).then(function () {

  // Destroy the database
  return slouch.db.destroy('mydb');

}).then(function () {

  // Database was destroyed

});
