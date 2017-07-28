'use strict';

var PersistentStreamIterator = require('quelle').PersistentStreamIterator,
  inherits = require('inherits');

var CouchPersistentStreamIterator = function () {
  // Call parent constructor
  PersistentStreamIterator.apply(this, arguments);
};

inherits(CouchPersistentStreamIterator, PersistentStreamIterator);

CouchPersistentStreamIterator.prototype._onceData = function (stream, data) {
  try {
    // Detect errors like authentication errors reported in JSON
    var obj = JSON.parse(data);
    if (obj.error) {
      stream.onError(new Error('reason=' + obj.reason + ', error=' + obj.error));

      // We need to abort the PersistentStream so that we don't read any items downstream
      this.abort();
    }
  } catch (err) {
    // Do nothing as the vast majority of the time we expect the JSON.parse to fail as the first
    // data to be read can be something like an opening bracket.
  }
};

module.exports = CouchPersistentStreamIterator;
