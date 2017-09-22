'use strict';

var NotAuthenticatedError = require('./not-authenticated-error'),
  url = require('url'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise');

var User = function (slouch) {
  this._slouch = slouch;
  this._dbName = '_users';
};

User.prototype.toUserId = function (username) {
  return 'org.couchdb.user:' + username;
};

User.prototype.toUsername = function (userId) {
  return userId.replace(/org.couchdb.user:/, '');
};

User.prototype._insert = function (username, user) {
  user._id = this.toUserId(username);
  return this._slouch.doc.update(this._dbName, user);
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

User.prototype.get = function (username, params) {
  return this._slouch.doc.get(this._dbName, this.toUserId(username), params);
};

User.prototype._update = function (username, user) {
  return this._insert(username, user);
};

User.prototype.addRole = function (username, role) {
  var self = this;
  return self.get(username).then(function (user) {
    user.roles.push(role);
    return self._update(username, user);
  });
};

User.prototype.upsertRole = function (username, role) {
  var self = this;
  return self._slouch.doc._persistThroughConflicts(function () {
    return self.addRole(username, role);
  });
};

User.prototype.removeRole = function (username, role) {
  var self = this;
  return self.get(username).then(function (user) {
    user.roles.splice(user.roles.indexOf(role), 1);
    return self._update(username, user);
  });
};

User.prototype.downsertRole = function (username, role) {
  var self = this;
  return self._slouch.doc._persistThroughConflicts(function () {
    return self.removeRole(username, role);
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
  return this.createSession({
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

User.prototype.createSession = function (doc) {
  return this._slouch._req({
    uri: this._slouch._url + '/_session',
    method: 'POST',
    json: doc
  });
};

// TODO: Also support option to pass in cookie
User.prototype.destroySession = function () {
  return this._slouch._req({
    uri: this._slouch._url + '/_session',
    method: 'DELETE'
  });
};

// TODO: get authenticate() and authenticated() working properly in the browser. For now, we
// have to fake the responses as it appears that the session cookie is not being propogated from
// the session post to the session get.
User.prototype.authenticated = function (cookie) {
  // Specify a URL w/o a username and password as we want to check to make sure that the cookie is
  // for a current session
  var parts = url.parse(this._slouch._url);
  var _url = parts.protocol + '//' + parts.host + parts.pathname;

  return this._slouch._req({
    uri: _url + '_session',
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

User.prototype.setCookie = function (cookie) {
  this._slouch._requestWrapper.setCookie(cookie);
};

User.prototype.logIn = function (username, password) {
  var self = this;
  return self.authenticate(username, password).then(function (response) {
    // Set cookie for all subsequent calls
    self.setCookie(response.cookie);
    return response;
  });
};

User.prototype.logOut = function () {
  // Destroy session
  var self = this;
  return self.destroySession().then(function (response) {
    // Remove cookie from subsequent requests
    self.setCookie(null);
    return response;
  });
};

// Provides a simple way of resolving conflicts at the user layer whereby a merge of the roles is
// assumed to be the only data needed in the conflicting docs. Until you resolve these conflicts,
// users cannot log in. You can pretty easily encounter conflicts on user docs with CouchDB 2. For
// example, if a user is being added to two roles simultaneously via different CouchDB nodes then
// when the CouchDB nodes replicate the user, the user will be in conflict.
User.prototype.resolveConflicts = function (username) {
  var self = this;
  return self.get(username, {
    conflicts: true
  }).then(function (user) {
    // Verify that there is a conflict
    if (user._conflicts) {

      var roles = sporks.flip(user.roles),
        gets = [],
        destroys = [];

      user._conflicts.forEach(function (rev) {
        gets.push(self.get(username, {
          rev: rev
        }).then(function (userRev) {
          userRev.roles.forEach(function (role) {
            // Build a list of all roles, using an associative array so that duplicates are ignored.
            roles[role] = true;
          });
        }));
      });

      return Promise.all(gets).then(function () {
        // Update the user and set all the roles
        user.roles = sporks.keys(roles);
        return self._update(username, user);
      }).then(function () {
        // Delete all the conflicts
        user._conflicts.forEach(function (rev) {
          destroys.push(self._destroy(username, rev));
        });
        return Promise.all(destroys);
      });

    }
  });
};

module.exports = User;
