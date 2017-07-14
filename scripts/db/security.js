'use strict';

var promisedRequest = require('../request');

var DB = function () {};

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
DB.prototype.setSecurity = function (dbName, security) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/_security',
    method: 'PUT',
    body: JSON.stringify(security)
  });
};

DB.prototype.getSecurity = function (dbName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/_security',
    method: 'GET'
  }, true);
};

module.exports = DB;
