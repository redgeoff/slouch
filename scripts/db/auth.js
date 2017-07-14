'use strict';

var DB = function () {};

DB.prototype.onlyRoleCanView = function (dbName, role) {
  return this.setSecurity(dbName, {
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

DB.prototype.onlyAdminCanView = function (dbName) {
  return this.onlyRoleCanView(dbName, '_admin');
};

module.exports = DB;
