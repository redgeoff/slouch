'use strict';

var Membership = function (slouch) {
  this._slouch = slouch;
};

Membership.prototype.get = function () {
  return promisedRequest.request({
    uri: this._slouch._url + '/_membership',
    method: 'GET'
  }, true);
};

module.exports = Membership;
