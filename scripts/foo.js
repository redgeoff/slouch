'use strict';

var Promise = require('bluebird');

var Foo = function () {
  this._thing = 'yar';
};

Foo.prototype.bar = function () {
  return Promise.resolve(this._thing);
};

module.exports = Foo;
