'use strict';

var promisedRequest = require('../request'),
  PersistentStreamIterator = require('quelle').PersistentStreamIterator;

var DB = function () {};

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

module.exports = DB;
