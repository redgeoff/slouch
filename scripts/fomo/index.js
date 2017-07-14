'use strict';

var Auth = require('./auth'),
  Config = require('./config'),
  DB = require('./db'),
  Doc = require('./doc'),
  Membership = require('./membership'),
  Security = require('./security'),
  System = require('./system'),
  User = require('./user');

var Slouch = function (url) {
  this._url = url;

  this.auth = new Auth(this);
  this.config = new Config(this);
  this.db = new DB(this);
  this.doc = new Doc(this);
  this.system = new System(this);
  this.membership = new Membership(this);
  this.security = new Security(this);
  this.user = new User(this);
};

module.exports = Slouch;
