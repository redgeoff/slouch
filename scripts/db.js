'use strict';

// TODO: use inheritance, mix-in to split into smaller files, e.g. file just for doc stuff

var promisedRequest = require('./request'),
  StreamIterator = require('quelle').StreamIterator,
  sporks = require('sporks'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  FilteredStreamIterator = require('quelle').FilteredStreamIterator,
  SystemCommon = require('./system-common');

var DB = function (url) {
  this._url = url;
  this._systemCommon = new SystemCommon(url);
};

// Max retries during an upsert before considering the operation a failure. The upserts immediately
// retry so if they fail this many times in a row then there is most likely an issue.
DB._MAX_RETRIES = 20;

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

// For example:
// {
//   "admins" : {
//      "names" : ["joe", "phil"],
//      "roles" : ["boss"]
//    },
//    "members" : {
//      "names" : ["dave"],
//      "roles" : ["producer", "consumer"]
//    }
// }
DB.prototype.setSecurity = function (dbName, security) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/_security',
    method: 'PUT',
    body: JSON.stringify(security)
  });
};

DB.prototype.getSecurity = function (dbName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/_security',
    method: 'GET'
  }, true);
};

// Use to create doc
DB.prototype.postDoc = function (dbName, doc) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName,
    method: 'POST',
    json: doc
  }).then(function (response) {
    return response.body;
  });
};

DB.prototype.postDocAndIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.postDoc(dbName, doc);
  });
};

// Use to update doc
DB.prototype.putDoc = function (dbName, doc) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/' + doc._id,
    method: 'PUT',
    body: JSON.stringify(doc)
  }).then(function () {
    // Return doc so that callers like getMergePut have an automatic way to get the data that was
    // put
    return doc;
  });
};

DB.prototype.ignoreConflict = function (promiseFactory) {
  return promiseFactory().catch(function (err) {
    if (err.error !== 'conflict') { // not a conflict?
      // Unexpected error
      throw err;
    }
  });
};

DB.prototype.putDocIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.putDoc(dbName, doc);
  });
};

DB.prototype.getDoc = function (dbName, docId) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/' + docId,
    method: 'GET'
  }, true);
};

DB.prototype.isMissingError = function (err) {
  return err.error === 'not_found';
};

DB.prototype.ignoreMissing = function (promiseFactory) {
  var self = this;
  return promiseFactory().catch(function (err) {
    if (!self.isMissingError(err)) { // not a not_found error?
      // Unexpected error
      throw err;
    }
  });
};

DB.prototype.getDocIgnoreMissing = function (dbName, id) {
  var self = this;
  return self.ignoreMissing(function () {
    return self.getDoc(dbName, id);
  });
};

DB.prototype.createOrUpdate = function (dbName, doc) {

  var self = this,
    clonedDoc = sporks.clone(doc);

  return self.getDoc(dbName, doc._id).then(function (_doc) {

    // Use the latest rev so that we can attempt to update the doc without a conflict
    clonedDoc._rev = _doc._rev;

    return self.putDoc(dbName, clonedDoc);

  }).catch(function (err) {

    if (self.isMissingError(err)) { // missing? This can be expected on the first put

      // The doc is missing so we attempt to create the doc w/o a rev number
      return self.postDoc(dbName, doc);

    } else {

      // Unexpected error
      throw err;

    }

  });
};

DB.prototype.createOrUpdateIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.createOrUpdate(dbName, doc);
  });
};

DB.prototype.upsert = function (dbName, doc) {

  var self = this,
    i = 0;

  var _upsert = function () {
    return self.createOrUpdate(dbName, doc).catch(function (err) {

      if (err.error === 'conflict' && i++ < DB._MAX_RETRIES) { // conflict?

        // Retry
        return _upsert();

      } else {

        // Unexpected error
        throw err;

      }

    });
  };

  return _upsert();
};

DB.prototype.getMergePut = function (dbName, doc) {

  var self = this;

  return self.getDoc(dbName, doc._id).then(function (_doc) {

    var clonedDoc = sporks.clone(_doc);

    clonedDoc = sporks.merge(clonedDoc, doc);

    return self.putDoc(dbName, clonedDoc);

  });
};

DB.prototype.getMergeCreateOrUpdate = function (dbName, doc) {

  var self = this;

  return self.getDocIgnoreMissing(dbName, doc._id).then(function (_doc) {

    var clonedDoc = null;

    if (_doc) {
      clonedDoc = sporks.clone(_doc);
      clonedDoc = sporks.merge(clonedDoc, doc);
    } else {
      clonedDoc = sporks.clone(doc);
    }

    return self.createOrUpdate(dbName, clonedDoc);

  });
};

DB.prototype.getMergePutIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.getMergePut(dbName, doc);
  });
};

DB.prototype.getMergeUpsert = function (dbName, doc) {

  var self = this,
    i = 0;

  var _upsert = function () {
    return self.getMergeCreateOrUpdate(dbName, doc).catch(function (err) {

      if (err.error === 'conflict' && i++ < DB._MAX_RETRIES) { // conflict?

        // Retry
        return _upsert();

      } else {

        // Unexpected error
        throw err;

      }

    });
  };

  return _upsert();
};

DB.prototype.getModifyUpsert = function (dbName, docId, onGetPromiseFactory) {

  var self = this,
    i = 0;

  var _upsert = function () {
    return self.getDoc(dbName, docId).then(function (doc) {
      return onGetPromiseFactory(doc);
    }).then(function (modifiedDoc) {
      return self.putDoc(dbName, modifiedDoc);
    }).catch(function (err) {

      if (err.error === 'conflict' && i++ < DB._MAX_RETRIES) { // conflict?

        // Retry
        return _upsert();

      } else {

        // Unexpected error
        throw err;

      }

    });
  };

  return _upsert();

};

DB.prototype.allDocs = function (dbName, params) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/_all_docs',
    method: 'GET',
    qs: params
  }, true);
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.allDocsIterator = function (dbName, params) {

  return new PersistentStreamIterator({
    url: this._url + '/' + dbName + '/_all_docs',
    method: 'GET',
    qs: params
  }, 'rows.*');

};

DB.prototype.viewIterator = function (dbName, viewDocId, view, params) {

  return new PersistentStreamIterator({
    url: this._url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  }, 'rows.*');

};

// NOTE: better to use viewIterator as there may be many docs
DB.prototype.view = function (dbName, viewDocId, view, params) {
  return promisedRequest.request({
    url: this._url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  });
};

DB.prototype.viewAndParse = function (dbName, viewDocId, view, params) {
  return promisedRequest.request({
    url: this._url + '/' + dbName + '/' + viewDocId + '/_view/' + view,
    qs: params
  }, true);
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.changesIterator = function (dbName, params) {

  var indefinite = false,
    jsonStreamParseStr = null;

  if (params && params.feed === 'continuous') {
    indefinite = true;
    jsonStreamParseStr = undefined;
  } else {
    jsonStreamParseStr = 'results.*';
  }

  return new PersistentStreamIterator({
    url: this._url + '/' + dbName + '/_changes',
    method: 'GET',
    qs: params
  }, jsonStreamParseStr, indefinite);

};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
DB.prototype.dbUpdatesIterator = function (params) {

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

DB.prototype.destroyAllNonDesignDocs = function (dbName) {
  return this.destroyAllDocs(dbName, true);
};

DB.prototype.destroyAllDocs = function (dbName, keepDesignDocs, exceptDBNames) {
  var self = this;

  return self.allDocsIterator(dbName).each(function (doc) {
    if ((!keepDesignDocs || doc.id.indexOf('_design') === -1) &&
      (!exceptDBNames || exceptDBNames.indexOf(doc.id) !== -1)) {
      return self.destroyDoc(dbName, doc.id, doc.value.rev);
    }
  });
};

DB.prototype.destroyDoc = function (dbName, docId, docRev) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/' + docId,
    method: 'DELETE',
    qs: {
      rev: docRev
    }
  });
};

DB.prototype.destroyDocIgnoreConflict = function (dbName, docId, docRev) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.destroyDoc(dbName, docId, docRev);
  });
};

DB.prototype.getAndDestroyDoc = function (dbName, docId) {
  var self = this;
  return self.getDoc(dbName, docId).then(function (doc) {
    return self.destroyDoc(dbName, docId, doc._rev);
  });
};

DB.prototype.markDocAsDestroyed = function (dbName, docId) {
  return this.getMergePut(dbName, {
    _id: docId,
    _deleted: true
  });
};

// Just for formalizing the setting of the _deleted flag
DB.prototype.setDeleted = function (doc) {
  doc._deleted = true;
};

DB.prototype.onlyRoleCanView = function (dbName, role) {
  return this.setSecurity(dbName, {
    admins: {
      names: ['_admin'],
      roles: []
    },
    members: {
      names: [],
      roles: [role]
    }
  });
};

DB.prototype.onlyAdminCanView = function (dbName) {
  return this.onlyRoleCanView(dbName, '_admin');
};

DB.prototype.getAttachment = function (dbName, docId, attachmentName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/' + docId + '/' + attachmentName,
    method: 'GET',
    raw: true,
    encoding: null
  }).then(function (response) {
    return response.body;
  });
};

DB.prototype.dbUpdatesViaGlobalChangesIterator = function (params) {
  var self = this,
    iterator = new StreamIterator();

  self.get('_global_changes').then(function (dbDoc) {
    var clonedParams = sporks.clone(params);
    clonedParams.since = dbDoc.update_seq;

    // We pipe to the returned iterator so that the function can return an iterator who's content is
    // deferred.
    self.changesIterator('_global_changes', clonedParams).pipe(iterator);
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
DB.prototype.dbUpdatesNoHistoryIterator = function (params) {
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

module.exports = DB;
