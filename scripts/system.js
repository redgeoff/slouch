'use strict';

var promisedRequest = require('./request'),
  FilteredStreamIterator = require('quelle').FilteredStreamIterator,
  PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  StreamIterator = require('quelle').StreamIterator,
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise');

var System = function (slouch) {
  this._slouch = slouch;
  this._couchDB1 = null;
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

// Use a JSONStream so that we don't have to load a large JSON structure into memory
System.prototype.updates = function (params) {
  return new PersistentStreamIterator({
    url: this._slouch._url + '/_db_updates',
    method: 'GET',
    qs: params
  }, 'results.*');
};

System.prototype.updatesViaGlobalChanges = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self._slouch.db.get('_global_changes').then(function (dbDoc) {
    var clonedParams = sporks.clone(params);
    clonedParams.since = dbDoc.update_seq;

    // We pipe to the returned iterator so that the function can return an iterator who's content is
    // deferred.
    self._slouch.db.changes('_global_changes', clonedParams).pipe(iterator);
  });

  return new FilteredStreamIterator(iterator, function (item) {
    // Repackage the item so that it is compatible with _db_updates.
    var parts = item.id.split(':');
    return {
      db_name: parts[1],
      type: parts[0]
    };
  });
};

// The _db_updates feed in CouchDB does not include any history, i.e. any updates before when we
// start listening to the feed. CouchDB 2 on the other hand stores the complete history in the
// _global_changes database. We use the _changes feed on the _global_changes database to provide a
// backwards compatible API.
System.prototype.updatesNoHistory = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self._slouch._system.isCouchDB1().then(function (isCouchDB1) {
    if (isCouchDB1) {
      return self._slouch.db.updates(params);
    } else {
      return self.updatesViaGlobalChanges(params);
    }
  }).then(function (_iterator) {
    // We pipe to the returned iterator so that the function can return an iterator who's content is
    // deferred.
    _iterator.pipe(iterator);
  });

  return iterator;
};

module.exports = System;
