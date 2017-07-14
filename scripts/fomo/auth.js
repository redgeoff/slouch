'use strict';

var Auth = function (slouch) {
  this._slouch = slouch;
};

Auth.prototype.onlyRoleCanView = function (dbName, role) {
  return this._slouch.security.set(dbName, {
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

Auth.prototype.onlyAdminCanView = function (dbName) {
  return this.onlyRoleCanView(dbName, '_admin');
};

module.exports = Auth;
