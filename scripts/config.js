'use strict';

var Promise = require('sporks/scripts/promise'),
  request = require('./request'),
  DB = require('./db'),
  System = require('./system');

var Config = function (url) {
  this._url = url;
  this._db = new DB(url);
  this._system = new System(url);
};

Config.prototype._couchDB2Request = function (node, path, opts, parseBody) {
  opts.uri = this._url + '/_node/' + node + '/_config/' + path;
  return request.request(opts, parseBody);
};

// Warning: as per https://github.com/klaemo/docker-couchdb/issues/42#issuecomment-169610897, this
// isn't really the best approach as a more complete solution would implement some rollback
// mechanism when a node fails after several attempts. (Retries are already attempted by the
// request).
Config.prototype._couchDB2Requests = function (path, opts, parseBody, maxNumNodes) {
  var self = this,
    promises = [],
    i = 0;
  return self._system.membership().then(function (members) {
    members.cluster_nodes.forEach(function (node) {
      if (typeof maxNumNodes === 'undefined' || i++ < maxNumNodes) {
        promises.push(self._couchDB2Request(node, path, opts, parseBody));
      }
    });

    // Only return a single promise when there is a single promise so that the return value
    // is consistent for a single node.
    return promises.length > 1 ? Promise.all(promises) : promises[0];
  });
};

Config.prototype._couchDB1Request = function (path, opts, parseBody) {
  opts.uri = this._url + '/_config/' + path;
  return request.request(opts, parseBody);
};

Config.prototype._request = function (path, opts, parseBody, maxNumNodes) {
  var self = this;
  return self._system.isCouchDB1().then(function (isCouchDB1) {
    if (isCouchDB1) {
      return self._couchDB1Request(path, opts, parseBody);
    } else {
      return self._couchDB2Requests(path, opts, parseBody, maxNumNodes);
    }
  });
};

Config.prototype.set = function (path, value) {
  return this._request(path, {
    method: 'PUT',
    body: JSON.stringify(value)
  });
};

Config.prototype.unset = function (path) {
  return this._request(path, {
    method: 'DELETE'
  });
};

Config.prototype.unsetIgnoreMissing = function (path) {
  var self = this;
  return self._db.ignoreMissing(function () {
    return self.unset(path);
  });
};

Config.prototype.setCouchHttpdAuthTimeout = function (timeoutSecs) {
  // Convert timeout value to a string
  return this.set('couch_httpd_auth/timeout', timeoutSecs + '');
};

Config.prototype.setCouchHttpdAuthAllowPersistentCookies = function (allow) {
  return this.set('couch_httpd_auth/allow_persistent_cookies', allow);
};

Config.prototype.setLogLevel = function (level) {
  return this.set('log/level', level);
};

Config.prototype.setCompactionRule = function (dbName, rule) {
  return this.set('compactions/' + dbName, rule);
};

Config.prototype.setCouchDBMaxDBsOpen = function (maxDBsOpen) {
  return this.set('couchdb/max_dbs_open', maxDBsOpen);
};

Config.prototype.setHttpdMaxConnections = function (maxConnections) {
  return this.set('httpd/max_connections', maxConnections);
};

module.exports = Config;
