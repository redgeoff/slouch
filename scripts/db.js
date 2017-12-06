'use strict';

var CouchPersistentStreamIterator = require('./couch-persistent-stream-iterator'),
  FilteredStreamIterator = require('quelle').FilteredStreamIterator;

var DB = function (slouch) {
  this._slouch = slouch;
};

DB.prototype._create = function (dbName) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName),
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
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName),
    method: 'DELETE',
    parseBody: true
  });
};

DB.prototype.get = function (dbName) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName),
    method: 'GET',
    parseBody: true
  });
};

DB.prototype.exists = function (dbName) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName),
    method: 'GET'
  }).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
};

DB.prototype._setSince = function (opts, lastSeq) {
  if (lastSeq) {
    opts.qs.since = lastSeq;
  }
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.changes = function (dbName, params) {

  var self = this,
    indefinite = false,
    jsonStreamParseStr = null,
    request = null,
    lastSeq = null,
    forceReconnectAfterMilliseconds = null;

  if (params && params.feed === 'continuous') {
    indefinite = true;
    jsonStreamParseStr = undefined;

    // When continuously listening to a CouchDB stream our stream can just deadlock, even when we
    // specify a heartbeat=60s. This rarely happens, about once a week, but when it does it can
    // cause major issues for users. It isn't clear if this issue is at the CouchDB, AWS load
    // balancer or Slouch layer as there are no errors generated, but we can avoid it by simply
    // reconnecting periodically.
    forceReconnectAfterMilliseconds = self._slouch.forceReconnectAfterMilliseconds;

    // Define a wrapper for the request so that we can inject an update "since" on reconnect so that
    // our place can be resumed
    request = function () {
      self._setSince(arguments[0], lastSeq);
      return self._slouch._request.apply(self._slouch, arguments);
    };
  } else {
    jsonStreamParseStr = 'results.*';
    request = self._slouch._request;
  }

  var iterator = new CouchPersistentStreamIterator({
    url: self._slouch._url + '/' + dbName + '/_changes',
    method: 'GET',
    qs: params
  }, jsonStreamParseStr, indefinite, request, forceReconnectAfterMilliseconds);

  return new FilteredStreamIterator(iterator, function (item) {
    // Store the lastSeq so that we can resume after a reconnect
    lastSeq = item.seq;
    return item;
  });

};

DB.prototype.changesArray = function (dbName, params) {
  return this._slouch._req({
    url: this._slouch._url + '/' + encodeURIComponent(dbName) + '/_changes',
    qs: params,
    parseBody: true
  });
};

DB.prototype.view = function (dbName, viewDocId, view, params) {
  var encodedViewDocId = '_design/' + encodeURIComponent(viewDocId.substr(8));
  return new CouchPersistentStreamIterator({
    url: this._slouch._url + '/' + encodeURIComponent(dbName) + '/' + encodedViewDocId +
      '/_view/' +
      view,
    qs: params
  }, 'rows.*');
};

DB.prototype.viewArray = function (dbName, viewDocId, view, params) {
  var encodedViewDocId = '_design/' + encodeURIComponent(viewDocId.substr(8));
  return this._slouch._req({
    url: this._slouch._url + '/' + encodeURIComponent(dbName) + '/' + encodedViewDocId +
      '/_view/' +
      view,
    qs: params,
    parseBody: true
  });
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.all = function () {
  return new CouchPersistentStreamIterator({
    url: this._slouch._url + '/_all_dbs'
  }, '*');
};

DB.prototype.replicate = function (params) {
  return this._slouch._req({
    url: this._slouch._url + '/_replicate',
    method: 'POST',
    json: params
  });
};

// TODO: support fromDBName and toDbName also being URLs
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
