'use strict';

var PersistentStreamIterator = require('quelle').PersistentStreamIterator;

var DB = function () {};

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

module.exports = DB;
