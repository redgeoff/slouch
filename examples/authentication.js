'use strict';

var Slouch = require('../');
var slouch = new Slouch('http://localhost:5984');

var adminUsername = 'admin';
var adminPassword = 'admin';

var nonAdminUsername = 'ada';
var nonAdminPassword = 'secrect';

// The role and dbName will be the same name as the nonAdminUsername
var role = nonAdminUsername;
var dbName = nonAdminUsername;

// Login as the admin so that we can create the user and DB
slouch.user.logIn(adminUsername, adminPassword).then(function () {

  // Create a new user
  slouch.user.create(nonAdminUsername, nonAdminPassword, [ role ]);

}).then(function () {

  // Create the database
  return slouch.db.create(dbName);

}).then(function () {

  // Set the security so that only the nonAdminUsername can edit this DB
  return slouch.security.onlyRoleCanView(dbName, role);

}).then(function () {

  // Log out as admin
  return slouch.user.logOut();

}).then(function () {

  // Log in as nonAdminUsername
  return slouch.user.logIn(nonAdminUsername, nonAdminPassword);

}).then(function () {

  // Create a doc
  return slouch.doc.create(dbName, { _id: '1', foo: 'bar' });

}).then(function (doc) {

  // Update the doc
  return slouch.doc.upsert(dbName, { _id: '1', foo: 'yar' });

}).then(function () {

  // Log out as nonAdminUsername
  return slouch.user.logOut();

});
