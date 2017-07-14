'use strict';

var Promise = require('sporks/scripts/promise'),
  promisedRequest = require('./request'),
  DB = require('./db'),
  sporks = require('sporks'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  FilteredStreamIterator = require('quelle').FilteredStreamIterator,
  StreamIterator = require('quelle').StreamIterator,
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

// Use a JSONStream so that we don't have to load a large JSON structure into memory
System.prototype.dbUpdatesIterator = function (params) {

  var indefinite = false,
    jsonStreamParseStr = null;

  if (params && params.feed === 'continuous') {
    indefinite = true;
    jsonStreamParseStr = undefined;
  } else {
    jsonStreamParseStr = 'results.*';
  }

  return new PersistentStreamIterator({
    url: this._url + '/_db_updates',
    method: 'GET',
    qs: params
  }, jsonStreamParseStr, indefinite);

};

System.prototype.dbUpdatesViaGlobalChangesIterator = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self._db.get('_global_changes').then(function (dbDoc) {
    var clonedParams = sporks.clone(params);
    clonedParams.since = dbDoc.update_seq;

    // We pipe to the returned iterator so that the function can return an iterator who's content is
    // deferred.
    self._db.changesIterator('_global_changes', clonedParams).pipe(iterator);
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
System.prototype.dbUpdatesNoHistoryIterator = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self._systemCommon.isCouchDB1().then(function (isCouchDB1) {
    if (isCouchDB1) {
      return self.dbUpdatesIterator(params);
    } else {
      return self.dbUpdatesViaGlobalChangesIterator(params);
    }
  }).then(function (_iterator) {
    // We pipe to the returned iterator so that the function can return an iterator who's content is
    // deferred.
    _iterator.pipe(iterator);
  });

  return iterator;
};

module.exports = System;
