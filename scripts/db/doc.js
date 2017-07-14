'use strict';

var promisedRequest = require('../request'),
  sporks = require('sporks'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator;

var DB = function () {};

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

module.exports = DB;
