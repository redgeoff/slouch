'use strict';

var DB = function () {};

// Max retries during an upsert before considering the operation a failure. The upserts immediately
// retry so if they fail this many times in a row then there is most likely an issue.
DB._MAX_RETRIES = 20;

DB.prototype.ignoreConflict = function (promiseFactory) {
  return promiseFactory().catch(function (err) {
    if (err.error !== 'conflict') { // not a conflict?
      // Unexpected error
      throw err;
    }
  });
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

module.exports = DB;
