'use strict';

var config = require('./config.json'),
  Slouch = require('../scripts');

var Utils = function () {
  this._dbId = 0;
  this.createdDB = null;
  this._slouch = new Slouch(this.couchDBURL());
};

Utils.prototype.couchDBURL = function () {
  return config.couchdb.scheme + '://' + config.couchdb.username + ':' +
    config.couchdb.password + '@' + config.couchdb.host + ':' + config.couchdb.port;
};

Utils.prototype.couchDBURLNoAuth = function () {
  return config.couchdb.scheme + '://' + config.couchdb.host + ':' + config.couchdb.port;
};

Utils.prototype.nextId = function () {
  return this._dbId++;
};

// Use unique DB names for each tests as there can be race conditions where a DB is destroyed, but
// has not yet been fully released.
Utils.prototype.createDB = function (partitioned = null) {
  this.createdDB = 'test$()+-/_' + this.nextId();
  if (partitioned)
    return this._slouch.db.create(this.createdDB, { partitioned: true });
  else
    return this._slouch.db.create(this.createdDB);
};

Utils.prototype.destroyDB = function () {
  return this._slouch.db.destroy(this.createdDB);
};

module.exports = new Utils();
