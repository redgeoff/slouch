'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://localhost:5984');

slouch.db.create('mydb').then(function () {

  return slouch.doc.create('mydb', { foo: 'bar' });

}).then(function (doc) {

  return slouch.doc.update('mydb', { _id: doc.id, _rev: doc.rev, foo: 'yar' });

}).then(function (doc) {

  return slouch.doc.get('mydb', doc._id);

}).then(function (doc) {

  return slouch.db.destroy('mydb');

}).then(function () {

  // Database was destroyed

});
