'use strict';

var Promise = require('sporks/scripts/promise'),
  req = Promise.promisify(require('request')),
  Throttler = require('squadron').Throttler,
  Backoff = require('backoff-promise');

// Until https://github.com/Gozala/querystring/issues/20 is fixed, we need to manually define an
// unescape function
var QueryString = require('request/lib/querystring').Querystring;
QueryString.prototype.unescape = function (s) {
  return decodeURIComponent(s);
};

var RequestClass = function () {
  this._throttler = new Throttler(RequestClass.DEFAULT_CONNECTIONS);
};

// For debugging all traffic
RequestClass.LOG_EVERYTHING = false;

RequestClass.prototype._log = function () {
  if (RequestClass.LOG_EVERYTHING) {
    console.log.apply(console.log, arguments);
  }
};

// The default value for max_dbs_open is 500 and we want to leave some space for other processes to
// also hit the DB.
RequestClass.DEFAULT_CONNECTIONS = 20;

RequestClass.MAX_RETRIES = 10;

// Preserve some compatibility with nano
RequestClass.prototype._getStatusCode = function (body) {
  switch (body.error) {
  case 'conflict':
    return 409;
  case 'not_found':
    return 404;
  }

  if (body.reason && body.reason.indexOf('Could not open source database') !== -1) {
    return 404;
  }
};

RequestClass.prototype._request = function (opts, parseBody) {
  var self = this,
    selfArguments = arguments;

  return req.apply(this, arguments).then(function (response) {

    var err = null;

    // Sometimes CouchDB just returns an malformed error
    if (!response || !response.body) {
      err = new Error('malformed body');
      err.error = 'malformed body';
      self._log('Slouch Request:', {
        error: 'malformed body',
        request: opts
      });
      throw err;
    }

    var body = null;
    if (opts.encoding === null || typeof response.body !== 'string') {
      body = response.body;
    } else {
      body = JSON.parse(response.body);
    }

    self._log('Slouch Request:', {
      request: opts,
      response: body
    });

    if (body.error) {
      err = new Error('reason=' + body.reason + ', error=' + body.error + ', arguments' +
        JSON.stringify(selfArguments));
      err.statusCode = self._getStatusCode(body);
      err.error = body.error;
      throw err;
    } else {
      return parseBody ? body : response;
    }
  });
};

RequestClass.prototype._throttledRequestClass = function () {
  var self = this,
    selfArguments = arguments;
  return self._throttler.run(function () {
    return self._request.apply(self, selfArguments);
  });
};

RequestClass.prototype._shouldReconnect = function (err) {
  switch (err.message) {

  case 'all_dbs_active': // No more connections
    return true;

  default:

    // - ECONNREFUSED => Connection refused, e.g. because the CouchDB server is being restarted.
    // - Occurs randomly when many simultaenous connections:
    //   - emfile
    //   - socket hang up
    //   - ECONNRESET
    //   - ETIMEDOUT
    //   - function_clause (CouchDB 2)
    //   - unknown_error (CouchDB 2)
    //   - internal_server_error (CouchDB 2)
    return new RegExp([
      'ECONNREFUSED',
      'ENETUNREACH', // can occur when box sleeps/wakes-up
      'emfile',
      'socket hang up',
      'ECONNRESET',
      'ETIMEDOUT',
      'function_clause',
      'unknown_error',
      'internal_server_error'
    ].join('|')).test(err.message);
  }
};

RequestClass.prototype._shouldIgnore = function (err) {
  // For some strange reason, CouchDB will give us "default_authentication_handler" errors even when
  // the request was successful and we need to ignore these errors.
  return /default_authentication_handler/.test(err.message);
};

// Provide a construct for mocking
RequestClass.prototype._newBackoff = function () {
  return new Backoff();
};

RequestClass.prototype.request = function () {

  var self = this,
    selfArguments = arguments,
    backoff = self._newBackoff(),
    retries = 0;

  var backoffThrottledRequestClass = function () {
    return backoff.attempt(function () {
      return self._throttledRequestClass.apply(self, selfArguments);
    }).catch(function (err) {
      // Reached max retries?
      if (retries++ >= RequestClass.MAX_RETRIES) {
        throw err;
      } else if (self._shouldReconnect(err)) {
        // Attempt again
        return backoffThrottledRequestClass();
      } else if (!self._shouldIgnore(err)) {
        // Error doesn't warrant retry to throw to caller
        throw err;
      }
    });
  };

  return backoffThrottledRequestClass();
};

RequestClass.prototype.setMaxConnections = function (maxConnections) {
  // TODO: reducing the number doesn't work when it is done after the new max has already been
  // reached. Does it?
  this._throttler.setMaxConcurrentProcesses(maxConnections);
};

module.exports = RequestClass;
