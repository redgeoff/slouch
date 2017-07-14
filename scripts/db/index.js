'use strict';

// Use mixins so that code can be separated

var sporks = require('sporks'),
  SystemCommon = require('../system-common');

var modules = [
  require('./attachment'),
  require('./auth'),
  require('./changes'),
  require('./common'),
  require('./db'),
  require('./doc'),
  require('./security'),
  require('./view')
];

// Unified API
var DB = function (url) {
  this._url = url;
  this._systemCommon = new SystemCommon(url);
};

// Mix in functions
sporks.each(modules, function (Mod) {
  sporks.mix(Mod.prototype, DB.prototype);
});

module.exports = DB;
