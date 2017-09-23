'use strict';

var Security = function (slouch) {
  this._slouch = slouch;
};

// For example:
// {
//   "admins" : {
//      "names" : ["joe", "phil"],
//      "roles" : ["boss"]
//    },
//    "members" : {
//      "names" : ["dave"],
//      "roles" : ["producer", "consumer"]
//    }
// }
Security.prototype.set = function (dbName, security) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + dbName + '/_security',
    method: 'PUT',
    body: JSON.stringify(security)
  });
};

Security.prototype.get = function (dbName) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + dbName + '/_security',
    method: 'GET',
    parseBody: true
  });
};

Security.prototype.onlyRoleCanView = function (dbName, role) {
  return this.set(dbName, {
    admins: {
      names: ['_admin'],
      roles: []
    },
    members: {
      names: [],
      roles: [role]
    }
  });
};

Security.prototype.onlyAdminCanView = function (dbName) {
  return this.onlyRoleCanView(dbName, '_admin');
};

module.exports = Security;
