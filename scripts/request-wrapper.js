'use strict';

var request = require('request');

// A construct used to associate a cookie with a request. We include the cookie at this layer so
// that we have a single place to modify later when we migrate to using fetch instead of request.
//
// TODO: when EnhancedRequest is used in quelle then we should be able to move the logic from
// RequestWrapper into EnhancedRequest and remove RequestWrapper.
var RequestWrapper = function () {};

RequestWrapper.prototype._setCookieHeader = function (opts) {
  if ((!opts.headers || !opts.headers.cookie) && this._cookie) {
    if (!opts.headers) {
      opts.headers = {};
    }
    opts.headers.cookie = this._cookie;
  }
  opts.withCredentials = true; // Needed for cookie-authentication to work in browser
  return opts;
};

RequestWrapper.prototype.requestFactory = function () {
  var self = this;
  return function (opts) {
    arguments[0] = self._setCookieHeader(opts);
    return request.apply(request, arguments);
  };
};

RequestWrapper.prototype.setCookie = function (cookie) {
  this._cookie = cookie;
};

module.exports = RequestWrapper;
