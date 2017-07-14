'use strict';

// var slouch = new Slouch(some-url);
//
// slouch.db.create();
// slouch.db.changes();
// slouch.db.copy();
// slouch.db.all();
// slouch.db.allArray();
// slouch.db.replicate();
//
// slouch.security.set();
//
// slouch.doc.post();
// slouch.doc.destroy();
//
// slouch.user.create();
//
// slouch.config.set();
//
// slouch.auth.onlyRoleCanView();

var Auth = require('./auth'),
  Config = require('./config'),
  DB = require('./db'),
  Doc = require('./doc'),
  Security = require('./security'),
  User = require('./user');

var Slouch = function (url) {
  this._url = url;

  this.auth = new Auth(this);
  this.config = new Config(this);
  this.db = new DB(this);
  this.doc = new Doc(this);
  this.security = new Security(this);
  this.user = new User(this);
};

module.exports = Slouch;
