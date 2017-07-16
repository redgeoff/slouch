'use strict';

var promisedRequest = require('./request'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  sporks = require('sporks');

var Doc = function (slouch) {
  this._slouch = slouch;
};

// Max retries during an upsert before considering the operation a failure. The upserts immediately
// retry so if they fail this many times in a row then there is most likely an issue.
Doc.prototype.maxRetries = 20;

Doc.prototype.ignoreConflict = function (promiseFactory) {
  return promiseFactory().catch(function (err) {
    if (err.error !== 'conflict') { // not a conflict?
      // Unexpected error
      throw err;
    }
  });
};

Doc.prototype.isMissingError = function (err) {
  return err.error === 'not_found';
};

Doc.prototype.ignoreMissing = function (promiseFactory) {
  var self = this;
  return promiseFactory().catch(function (err) {
    if (!self.isMissingError(err)) { // not a not_found error?
      // Unexpected error
      throw err;
    }
  });
};

Doc.prototype.create = function (dbName, doc) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName,
    method: 'POST',
    json: doc
  }).then(function (response) {
    return response.body;
  });
};

Doc.prototype.createAndIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.create(dbName, doc);
  });
};

Doc.prototype.update = function (dbName, doc) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/' + doc._id,
    method: 'PUT',
    body: JSON.stringify(doc)
  }).then(function () {
    // Return doc so that callers like getMergeUpdate have an automatic way to get the data that was
    // update
    return doc;
  });
};

Doc.prototype.updateIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.update(dbName, doc);
  });
};

Doc.prototype.get = function (dbName, docId) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/' + docId,
    method: 'GET'
  }, true);
};

Doc.prototype.getIgnoreMissing = function (dbName, id) {
  var self = this;
  return self.ignoreMissing(function () {
    return self.get(dbName, id);
  });
};

Doc.prototype.exists = function (dbName, id) {
  return this.get(dbName, id).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
};

Doc.prototype.createOrUpdate = function (dbName, doc) {

  var self = this,
    clonedDoc = sporks.clone(doc);

  return self.get(dbName, doc._id).then(function (_doc) {

    // Use the latest rev so that we can attempt to update the doc without a conflict
    clonedDoc._rev = _doc._rev;

    return self.update(dbName, clonedDoc);

  }).catch(function (err) {

    if (self.isMissingError(err)) { // missing? This can be expected on the first update

      // The doc is missing so we attempt to create the doc w/o a rev number
      return self.create(dbName, doc);

    } else {

      // Unexpected error
      throw err;

    }

  });
};

Doc.prototype.createOrUpdateIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.createOrUpdate(dbName, doc);
  });
};

Doc.prototype._persistThroughConflicts = function (promiseFactory) {

  var self = this,
    i = 0;

  var run = function () {

    return promiseFactory().catch(function (err) {

      if (err.error === 'conflict' && i++ < self.maxRetries) { // conflict?

        // Retry
        return run();

      } else {

        // Unexpected error
        throw err;

      }

    });

  };

  return run();
};

Doc.prototype.upsert = function (dbName, doc) {
  var self = this;
  return self._persistThroughConflicts(function () {
    return self.createOrUpdate(dbName, doc);
  });
};

Doc.prototype.getMergeUpdate = function (dbName, doc) {

  var self = this;

  return self.get(dbName, doc._id).then(function (_doc) {

    var clonedDoc = sporks.clone(_doc);

    clonedDoc = sporks.merge(clonedDoc, doc);

    return self.update(dbName, clonedDoc);

  });
};

Doc.prototype.getMergeCreateOrUpdate = function (dbName, doc) {

  var self = this;

  return self.getIgnoreMissing(dbName, doc._id).then(function (_doc) {

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

Doc.prototype.getMergeUpdateIgnoreConflict = function (dbName, doc) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.getMergeUpdate(dbName, doc);
  });
};

Doc.prototype.getMergeUpsert = function (dbName, doc) {
  var self = this;
  return self._persistThroughConflicts(function () {
    return self.getMergeCreateOrUpdate(dbName, doc);
  });
};

Doc.prototype.getModifyUpsert = function (dbName, docId, onGetPromiseFactory) {
  var self = this;
  return self._persistThroughConflicts(function () {
    return self.get(dbName, docId).then(function (doc) {
      return onGetPromiseFactory(doc);
    }).then(function (modifiedDoc) {
      return self.update(dbName, modifiedDoc);
    });
  });
};

Doc.prototype.allArray = function (dbName, params) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/_all_docs',
    method: 'GET',
    qs: params
  }, true);
};

// Use a JSONStream so that we don't have to load a large JSON structure into memory
Doc.prototype.all = function (dbName, params) {
  return new PersistentStreamIterator({
    url: this._slouch._url + '/' + dbName + '/_all_docs',
    method: 'GET',
    qs: params
  }, 'rows.*');
};

Doc.prototype.destroyAllNonDesign = function (dbName) {
  return this.destroyAll(dbName, true);
};

Doc.prototype.destroyAll = function (dbName, keepDesignDocs) {
  var self = this;

  return self.all(dbName).each(function (doc) {
    if (!keepDesignDocs || doc.id.indexOf('_design') === -1) {
      return self.destroy(dbName, doc.id, doc.value.rev);
    }
  });
};

Doc.prototype.destroy = function (dbName, docId, docRev) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/' + docId,
    method: 'DELETE',
    qs: {
      rev: docRev
    }
  });
};

Doc.prototype.destroyIgnoreConflict = function (dbName, docId, docRev) {
  var self = this;
  return self.ignoreConflict(function () {
    return self.destroy(dbName, docId, docRev);
  });
};

Doc.prototype.getAndDestroy = function (dbName, docId) {
  var self = this;
  return self.get(dbName, docId).then(function (doc) {
    return self.destroy(dbName, docId, doc._rev);
  });
};

Doc.prototype.markAsDestroyed = function (dbName, docId) {
  return this.getMergeUpdate(dbName, {
    _id: docId,
    _deleted: true
  });
};

// Just for formalizing the setting of the _deleted flag
Doc.prototype.setDestroyed = function (doc) {
  doc._deleted = true;
};

Doc.prototype.getAttachment = function (dbName, docId, attachmentName) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/' + docId + '/' + attachmentName,
    method: 'GET',
    raw: true,
    encoding: null
  }).then(function (response) {
    return response.body;
  });
};

module.exports = Doc;
