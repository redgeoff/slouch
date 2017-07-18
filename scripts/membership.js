'use strict';

var promisedRequest = require('./request');

var Membership = function (slouch) {
  this._slouch = slouch;
  this._request = promisedRequest;
};

Membership.prototype.get = function () {
  return this._request.request({
    uri: this._slouch._url + '/_membership',
    method: 'GET'
  }, true);
};

module.exports = Membership;
