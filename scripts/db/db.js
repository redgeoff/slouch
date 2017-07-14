'use strict';

var promisedRequest = require('../request');

var DB = function () {};

DB.prototype._create = function (dbName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName,
    method: 'PUT'
  });
};

DB.prototype.create = function (dbName) {
  var self = this;

  return self._create(dbName).catch(function (err) {
    // During heavy traffic, CouchDB does this strange thing where it will return an error even when
    // the DB has been created. So, we check to see if the DB exists and then only throw the error
    // if the DB does not exist.
    return self.exists(dbName).then(function (exists) {
      if (!exists) {
        throw err;
      }
    });
  });
};

DB.prototype.destroy = function (dbName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName,
    method: 'DELETE'
  });
};

DB.prototype.get = function (dbName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName,
    method: 'GET'
  }, true);
};

DB.prototype.exists = function (dbName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName,
    method: 'GET'
  }).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
};

module.exports = DB;
