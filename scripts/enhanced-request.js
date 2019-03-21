'use strict';

// TODO: enhance even further so that this construct can also be used at the quelle layer. Among
// various benefits it would allow the PersistentStreams to be throttled.

var Promise = require('sporks/scripts/promise'),
  Throttler = require('squadron').Throttler,
  Backoff = require('backoff-promise'),
  NotAuthorizedError = require('./not-authorized-error'),
  sporks = require('sporks');

// Until https://github.com/Gozala/querystring/issues/20 is fixed, we need to manually define an
// unescape function
var QueryString = require('request/lib/querystring').Querystring;
QueryString.prototype.unescape = function (s) {
  return decodeURIComponent(s);
};

// Adds persistence, throttling, error handling and promises to request
var EnhancedRequest = function (slouch) {
  this._slouch = slouch;
  this._throttler = new Throttler(EnhancedRequest.DEFAULT_CONNECTIONS);
  this._req = Promise.promisify(this._slouch._request);
};

// For debugging all traffic
EnhancedRequest.LOG_EVERYTHING = false;

EnhancedRequest.prototype._censorLogArguments = function (args) {
  var censoredArgs = sporks.clone(sporks.toArgsArray(args));
  if (censoredArgs[1] && censoredArgs[1].request) {
    censoredArgs[1].request = this._censorOpts(censoredArgs[1].request);
  }
  return censoredArgs;
};

EnhancedRequest.prototype._log = function () {
  if (EnhancedRequest.LOG_EVERYTHING) {
    console.log.apply(console.log, this._censorLogArguments(arguments));
  }
};

// The default value for max_dbs_open is 500 and we want to leave some space for other processes to
// also hit the DB.
EnhancedRequest.DEFAULT_CONNECTIONS = 20;

EnhancedRequest.MAX_RETRIES = 10;

// Preserve some compatibility with nano
EnhancedRequest.prototype._getStatusCode = function (body) {
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

EnhancedRequest.prototype._censorOpts = function (opts) {
  // Censor any passwords
  if (opts.uri) {
    opts.uri = sporks.censorPasswordInURL(opts.uri);
  }

  return opts;
};

EnhancedRequest.prototype._newError = function (body, args) {
  var err = null,
    censoredArgs = sporks.clone(sporks.toArgsArray(args));

  censoredArgs[0] = this._censorOpts(censoredArgs[0]);

  var msg = 'reason=' + body.reason + ', error=' + body.error + ', arguments=' + JSON.stringify(
    censoredArgs);

  if (body.error === 'unauthorized') {
    err = new NotAuthorizedError(msg);
  } else {
    err = new Error(msg);
  }
  err.statusCode = this._getStatusCode(body);
  err.error = body.error;

  return err;
};

EnhancedRequest.prototype._getAndRemove = function (opts, name) {
  var val = opts[name];
  delete opts[name];
  return val;
};

EnhancedRequest.prototype._removeEnhancedOpts = function (opts) {
  var requestOpts = null,
    enhancedOpts = null;

  if (opts) {
    requestOpts = sporks.clone(opts);
    enhancedOpts = {
      parseBody: this._getAndRemove(requestOpts, 'parseBody'),
      fullResponse: this._getAndRemove(requestOpts, 'fullResponse')
    };
  }

  return {
    request: requestOpts,
    enhanced: enhancedOpts
  };
};

EnhancedRequest.prototype._request = function (opts) {

  var self = this,
    selfArguments = arguments,
    splitOpts = self._removeEnhancedOpts(opts);

  return self._req.apply(this, [splitOpts.request]).then(function (response) {

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

    // Update locally stored cookie when couchDB sends set-cookie in response - for node only
    // Skip this in browser coverage test to test failure as in browser, set-cookie is not accessible from headers
    /* istanbul ignore if */
    if (response.headers && response.headers['set-cookie']) {
      self._slouch._requestWrapper.setCookie(response.headers['set-cookie'][0]);
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
      err = self._newError(body, selfArguments);
      throw err;
    } else {
      if (splitOpts.enhanced.parseBody) {
        response.body = body;
      }

      if (splitOpts.enhanced.fullResponse) {
        return response;
      } else {
        return splitOpts.enhanced.parseBody ? body : response;
      }
    }
  });
};

EnhancedRequest.prototype._throttledEnhancedRequest = function () {
  var self = this,
    selfArguments = arguments;
  return self._throttler.run(function () {
    return self._request.apply(self, selfArguments);
  });
};

EnhancedRequest.prototype._shouldReconnect = function (err) {
  switch (err.message) {

  case 'all_dbs_active': // No more connections
    return true;

  default:
    return new RegExp([
      // Connection refused, e.g. because the CouchDB server is being restarted.
      'ECONNREFUSED',

      'ENETUNREACH', // can occur when box sleeps/wakes-up

      // Occurs randomly when many simultaenous connections:
      'emfile',
      'socket hang up',
      'ECONNRESET',
      'ETIMEDOUT',
      'function_clause',
      'unknown_error',
      'internal_server_error',

      'Failed to fetch', // ECONNREFUSED/ENOTFOUND in Chrome
      'Type error', // ECONNREFUSED/ENOTFOUND in Safari
      'XHR error', // ECONNREFUSED/ENOTFOUND in Firefox
      'EAI_AGAIN' // Transient DNS error

      // TODO: It is not clear why CouchDB responds with these timeout errors and immediately
      // retrying the request often leads to deadlocks when you are continuously listening. In
      // practice, it is better that your app throws a fatal error and then is restarted, e.g. via
      // Docker, as this seems to reliably recover from this state. At some point we should analyze
      // this better and determine where the bug lies and fix it at the root cause:
      // https://github.com/redgeoff/spiegel/issues/100
      //
      // Occurs randomly even when there is a relatively small amount of data, e.g. "The request
      // could not be processed in a reasonable amount of time"
      //
      // 'timeout'
    ].join('|'), 'i').test(err.message);
  }
};

EnhancedRequest.prototype._shouldIgnore = function (err) {
  // For some strange reason, CouchDB will give us "default_authentication_handler" errors even when
  // the request was successful and we need to ignore these errors.
  return /default_authentication_handler/.test(err.message);
};

// Provide a construct for mocking
EnhancedRequest.prototype._newBackoff = function () {
  return new Backoff();
};

EnhancedRequest.prototype.request = function () {

  var self = this,
    selfArguments = arguments,
    backoff = self._newBackoff(),
    retries = 0;

  var backoffThrottledEnhancedRequest = function () {
    return backoff.attempt(function () {
      return self._throttledEnhancedRequest.apply(self, selfArguments);
    }).catch(function (err) {
      // Reached max retries?
      if (retries++ >= EnhancedRequest.MAX_RETRIES) {
        throw err;
      } else if (self._shouldReconnect(err)) {
        // Attempt again
        return backoffThrottledEnhancedRequest();
      } else if (!self._shouldIgnore(err)) {
        // Error doesn't warrant retry to throw to caller
        throw err;
      }
    });
  };

  return backoffThrottledEnhancedRequest();
};

EnhancedRequest.prototype.setMaxConnections = function (maxConnections) {
  // TODO: reducing the number doesn't work when it is done after the new max has already been
  // reached. Does it?
  this._throttler.setMaxConcurrentProcesses(maxConnections);
};

module.exports = EnhancedRequest;
