'use strict';

var NotAuthenticatedError = require('../not-authenticated-error'),
  request = require('../request'),
  url = require('url'),
  sporks = require('sporks');

var User = function (slouch) {
  this._slouch = slouch;
};

User.prototype.toUserId = function (username) {
  return 'org.couchdb.user:' + username;
};

User.prototype.toUsername = function (userId) {
  return userId.replace(/org.couchdb.user:/, '');
};

User.prototype._insert = function (username, user) {
  user._id = this.toUserId(username);
  return this._slouch._db.put(this._dbName, user);
};

User.prototype.create = function (username, password, roles, metadata) {
  var user = {
    name: username,
    password: password,
    roles: typeof roles === 'undefined' ? [] : roles,
    type: 'user',
    metadata: metadata,
    createdAt: (new Date().toISOString())
  };

  return this._insert(username, user);
};

User.prototype.get = function (username) {
  return this._slouch.doc.get(this._dbName, this.toUserId(username));
};

User.prototype._update = function (username, user) {
  return this._insert(username, user);
};

User.prototype.addRole = function (username, role) {
  var self = this;
  return self.get(username).then(function (user) {
    user.roles.push(role);
    return self._update(username, user).catch(function (err) {
      if (err.statusCode === 409) { // conflict? Try again
        return self.addRole(username, role);
      } else {
        throw err;
      }
    });
  });
};

User.prototype.removeRole = function (username, role) {
  var self = this;
  return self.get(username).then(function (user) {
    user.roles.splice(user.roles.indexOf(role), 1);
    return self._update(username, user);
  });
};

User.prototype.setPassword = function (username, password) {
  var self = this;
  return self.get(username).then(function (user) {
    user.password = password;
    return self._update(username, user);
  });
};

User.prototype.setMetadata = function (username, metadata) {
  var self = this;
  return self.get(username).then(function (user) {
    user.metadata = sporks.merge(user.metadata, metadata);
    return self._update(username, user);
  });
};

User.prototype._destroy = function (username, rev) {
  return this._slouch.doc.destroy(this._dbName, this.toUserId(username), rev);
};

User.prototype.destroy = function (username) {
  var self = this;
  return self.get(username).then(function (user) {
    return self._destroy(username, user._rev);
  });
};

User.prototype.authenticate = function (username, password) {
  return this.postSession({
    name: username,
    password: password
  }).then(function (response) {
    return {
      cookie: response.headers['set-cookie'][0]
    };
  }).catch(function (err) {
    throw new NotAuthenticatedError(err.message);
  });
};

User.prototype.postSession = function (doc) {
  return request.request({
    uri: this._slouch_url + '/_session',
    method: 'POST',
    json: doc
  });
};

User.prototype.authenticated = function (cookie) {
  // Specify a URL w/o a username and password as we want to check to make sure that the cookie is
  // for a current session
  var parts = url.parse(this._slouch._url);
  var _url = parts.protocol + '//' + parts.host + parts.pathname;

  return request.request({
    uri: _url + '/_session',
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  }).then(function (response) {
    var body = JSON.parse(response.body);
    if (!body.userCtx.name) { // not authenticated?
      throw new NotAuthenticatedError('not authenticated via cookie');
    }
    return body;
  });
};

User.prototype.authenticateAndGetSession = function (username, password) {
  var self = this,
    response = null;
  return self.authenticate(username, password).then(function (_response) {
    response = _response;
    return self.authenticated(response.cookie);
  }).then(function (session) {
    session.cookie = response.cookie;
    return session;
  });
};

module.exports = User;
