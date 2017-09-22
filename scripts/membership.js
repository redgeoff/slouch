'use strict';

var Membership = function (slouch) {
  this._slouch = slouch;
};

Membership.prototype.get = function () {
  return this._slouch._req({
    uri: this._slouch._url + '/_membership',
    method: 'GET'
  }, true);
};

module.exports = Membership;
