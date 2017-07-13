'use strict';

var Promise = require('sporks/scripts/promise'),
  promisedRequest = require('./request'),
  DB = require('./db'),
  sporks = require('sporks'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  SystemCommon = require('./system-common');

var System = function (url) {
  this._url = url;
  this._db = new DB(url);
  this._systemCommon = new SystemCommon(url);
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
System.prototype.dbsIterator = function () {
  return new PersistentStreamIterator({
    url: this._url + '/_all_dbs'
  }, '*');
};

System.prototype.reset = function (exceptDBNames) {
  var self = this,
    except = exceptDBNames ? sporks.flip(exceptDBNames) : {},
    dbsToDestroyAndRecreate = [];

  return self.isCouchDB1().then(function (isCouchDB1) {
    if (isCouchDB1) {
      dbsToDestroyAndRecreate = ['_replicator'];
      // CouchDB 1 automatically recreates the _users database
    } else {
      // CouchDB 2 does not automatically recreate any databases so we have to do it ourselves
      dbsToDestroyAndRecreate = ['_replicator', '_global_changes', '_users'];
    }

    return self.dbsIterator().each(function (db) {
      if (except[db]) {
        // Do nothing
        return Promise.resolve();
      } else if (dbsToDestroyAndRecreate.indexOf(db) !== -1) {
        return self._db.destroy(db).then(function () {
          return self._db.create(db);
        });
      } else {
        return self._db.destroy(db);
      }
    });
  });
};

System.prototype.replicate = function (params) {
  return promisedRequest.request({
    url: this._url + '/_replicate',
    method: 'POST',
    json: params
  });
};

// For now, the copyDB function has to be in System so that we don't have a circular dependency
// between System and DB
System.prototype.copyDB = function (fromDBName, toDBName) {
  var self = this;
  return self._db.create(toDBName).then(function () {
    return self._db.getSecurity(fromDBName);
  }).then(function (security) {
    return self._db.setSecurity(toDBName, security);
  }).then(function () {
    return self.replicate({
      source: self._url + '/' + fromDBName,
      target: self._url + '/' + toDBName
    });
  });
};

System.prototype.get = function () {
  return this._systemCommon.get();
};

System.prototype.isCouchDB1 = function () {
  return this._systemCommon.isCouchDB1();
};

System.prototype.membership = function () {
  return promisedRequest.request({
    uri: this._url + '/_membership',
    method: 'GET'
  }, true);
};

module.exports = System;
