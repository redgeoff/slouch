'use strict';

var promisedRequest = require('./request'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator;

var DB = function (slouch) {
  this._slouch = slouch;
};

DB.prototype._create = function (dbName) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName,
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
    uri: this._slouch._url + '/' + dbName,
    method: 'DELETE'
  });
};

DB.prototype.get = function (dbName) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName,
    method: 'GET'
  }, true);
};

DB.prototype.exists = function (dbName) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName,
    method: 'GET'
  }).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.changes = function (dbName, params) {
  return new PersistentStreamIterator({
    url: this._slouch._url + '/' + dbName + '/_changes',
    method: 'GET',
    qs: params
  }, 'results.*');

};

DB.prototype.view = function (dbName, viewDocId, view, params) {
  return new PersistentStreamIterator({
    url: this._slouch._url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  }, 'rows.*');
};

DB.prototype.viewArray = function (dbName, viewDocId, view, params) {
  return promisedRequest.request({
    url: this._slouch._url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  }, true);
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.all = function () {
  return new PersistentStreamIterator({
    url: this._slouch._url + '/_all_dbs'
  }, '*');
};

DB.prototype.replicate = function (params) {
  return promisedRequest.request({
    url: this._slouch._url + '/_replicate',
    method: 'POST',
    json: params
  });
};

DB.prototype.copy = function (fromDBName, toDBName) {
  var self = this;
  return self.create(toDBName).then(function () {
    return self._slouch.security.get(fromDBName);
  }).then(function (security) {
    return self._slouch.security.set(toDBName, security);
  }).then(function () {
    return self.replicate({
      source: self._slouch._url + '/' + fromDBName,
      target: self._slouch._url + '/' + toDBName
    });
  });
};

module.exports = DB;
