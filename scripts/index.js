'use strict';

var Attachment = require('./attachment'),
  Config = require('./config'),
  DB = require('./db'),
  Doc = require('./doc'),
  ExcludeDesignDocsIterator = require('./exclude-design-docs-iterator'),
  Membership = require('./membership'),
  NotAuthenticatedError = require('./not-authenticated-error'),
  Security = require('./security'),
  System = require('./system'),
  User = require('./user'),
  EnhancedRequest = require('./enhanced-request'),
  RequestWrapper = require('./request-wrapper');

var Slouch = function (url) {
  this._url = url;

  // Package request so that we can inject a cookie, provide promises and better built-in logic
  this._requestWrapper = new RequestWrapper();
  this._request = this._requestWrapper.requestFactory();
  this._enhancedRequest = new EnhancedRequest(this);

  // Shorthand so that can just issue _slouch.req() in different modules
  this._req = this._requestFactory();

  this.attachment = new Attachment(this);
  this.config = new Config(this);
  this.db = new DB(this);
  this.doc = new Doc(this);
  this.ExcludeDesignDocsIterator = ExcludeDesignDocsIterator;
  this.system = new System(this);
  this.membership = new Membership(this);
  this.NotAuthenticatedError = NotAuthenticatedError;
  this.security = new Security(this);
  this.user = new User(this);

  // When continuously listening to a CouchDB stream our stream can just deadlock, even when we
  // specify a heartbeat=60s. This rarely happens, about once a week, but when it does it can cause
  // major issues for users. It isn't clear if this issue is at the CouchDB, AWS load balancer or
  // Slouch layer as there are no errors generated, but we can avoid it by simply reconnecting
  // periodically.
  this.forceReconnectAfterMilliseconds = Slouch.DEFAULT_FORCE_RECONNECT_AFTER_MILLISECONDS;
};

Slouch.DEFAULT_FORCE_RECONNECT_AFTER_MILLISECONDS = 300000;

Slouch.prototype._requestFactory = function () {
  var self = this;
  return function () {
    return self._enhancedRequest.request.apply(self._enhancedRequest, arguments);
  };
};

module.exports = Slouch;
