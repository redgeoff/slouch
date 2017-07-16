'use strict';

var Attachment = require('./attachment'),
  Auth = require('./auth'),
  Config = require('./config'),
  DB = require('./db'),
  Doc = require('./doc'),
  ExcludeDesignDocsIterator = require('./exclude-design-docs-iterator'),
  Membership = require('./membership'),
  NotAuthenticatedError = require('./not-authenticated-error'),
  Security = require('./security'),
  System = require('./system'),
  User = require('./user');

var Slouch = function (url) {
  this._url = url;

  this.attachment = new Attachment(this);
  this.auth = new Auth(this);
  this.config = new Config(this);
  this.db = new DB(this);
  this.doc = new Doc(this);
  this.ExcludeDesignDocsIterator = ExcludeDesignDocsIterator;
  this.system = new System(this);
  this.membership = new Membership(this);
  this.NotAuthenticatedError = NotAuthenticatedError;
  this.security = new Security(this);
  this.user = new User(this);
};

module.exports = Slouch;
