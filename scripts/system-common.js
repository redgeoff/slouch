'use strict';

var Promise = require('sporks/scripts/promise'),
  promisedRequest = require('./request');

// Used to prevent a circular dependency between db and system
var SystemCommon = function (url) {
  this._url = url;
  this._couchDB1 = null;
};

SystemCommon.prototype._isCouchDB1 = function () {
  return this.get().then(function (obj) {
    return obj.version[0] === '1';
  });
};

SystemCommon.prototype.isCouchDB1 = function () {
  var self = this;
  return Promise.resolve().then(function () {
    if (self._couchDB1 === null) {
      return self._isCouchDB1().then(function (isCouchDB1) {
        self._couchDB1 = isCouchDB1;
        return self._couchDB1;
      });
    } else {
      return self._couchDB1;
    }
  });
};

SystemCommon.prototype.get = function () {
  return promisedRequest.request({
    uri: this._url + '/',
    method: 'GET'
  }, true);
};

module.exports = SystemCommon;
