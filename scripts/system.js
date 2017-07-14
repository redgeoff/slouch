'use strict';

var promisedRequest = require('./request'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise');

var System = function (slouch) {
  this._slouch = slouch;
};

System.prototype._isCouchDB1 = function () {
  return this.get().then(function (obj) {
    return obj.version[0] === '1';
  });
};

System.prototype.isCouchDB1 = function () {
  var self = this;
  return Promise.resolve().then(function () {
    if (self._couchDB1 === null) {
      return self._isCouchDB1().then(function (isCouchDB1) {
        self._couchDB1 = isCouchDB1;
        return self._couchDB1;
      });
    } else {
      return self._couchDB1;
    }
  });
};

System.prototype.get = function () {
  return promisedRequest.request({
    uri: this._slouch._url + '/',
    method: 'GET'
  }, true);
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

    return self._slouch.db.all().each(function (db) {
      if (except[db]) {
        // Do nothing
        return Promise.resolve();
      } else if (dbsToDestroyAndRecreate.indexOf(db) !== -1) {
        return self._slouch.db.destroy(db).then(function () {
          return self._slouch.db.create(db);
        });
      } else {
        return self._slouch.db.destroy(db);
      }
    });
  });
};

module.exports = System;
