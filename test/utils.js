'use strict';

var config = require('./config.json');

var Utils = function () {};

Utils.prototype.couchDBURL = function () {
  return config.couchdb.scheme + '://' + config.couchdb.username + ':' +
    config.couchdb.password + '@' + config.couchdb.host + ':' + config.couchdb.port;
};

module.exports = new Utils();
