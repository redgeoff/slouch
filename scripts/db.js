'use strict';

var promisedRequest = require('./request'),
  FilteredStreamIterator = require('quelle').FilteredStreamIterator,
  PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  StreamIterator = require('quelle').StreamIterator,
  sporks = require('sporks');

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

  var indefinite = false,
    jsonStreamParseStr = null;

  if (params && params.feed === 'continuous') {
    indefinite = true;
    jsonStreamParseStr = undefined;
  } else {
    jsonStreamParseStr = 'results.*';
  }

  return new PersistentStreamIterator({
    url: this._slouch._url + '/' + dbName + '/_changes',
    method: 'GET',
    qs: params
  }, jsonStreamParseStr, indefinite);

};

DB.prototype.view = function (dbName, viewDocId, view, params) {
  return new PersistentStreamIterator({
    url: this._slouch_url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  }, 'rows.*');
};

DB.prototype.viewArray = function (dbName, viewDocId, view, params) {
  return promisedRequest.request({
    url: this._slouch_url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  });
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.all = function () {
  return new PersistentStreamIterator({
    url: this._slouch._url + '/_all_dbs'
  }, '*');
};

DB.prototype.replicate = function (params) {
  return promisedRequest.request({
    url: this._url + '/_replicate',
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

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.updates = function (params) {

  var indefinite = false,
    jsonStreamParseStr = null;

  if (params && params.feed === 'continuous') {
    indefinite = true;
    jsonStreamParseStr = undefined;
  } else {
    jsonStreamParseStr = 'results.*';
  }

  return new PersistentStreamIterator({
    url: this._slouch._url + '/_db_updates',
    method: 'GET',
    qs: params
  }, jsonStreamParseStr, indefinite);

};

DB.prototype.updatesViaGlobalChanges = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self.get('_global_changes').then(function (dbDoc) {
    var clonedParams = sporks.clone(params);
    clonedParams.since = dbDoc.update_seq;

    // We pipe to the returned iterator so that the function can return an iterator who's content is
    // deferred.
    self.changes('_global_changes', clonedParams).pipe(iterator);
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
DB.prototype.updatesNoHistory = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self._slouch._system.isCouchDB1().then(function (isCouchDB1) {
    if (isCouchDB1) {
      return self.updates(params);
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

module.exports = DB;
