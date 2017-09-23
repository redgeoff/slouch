'use strict';

var NotAuthorizedError = function (message) {
  this.name = 'NotAuthorizedError';
  this.message = message;
};

NotAuthorizedError.prototype = Object.create(Error.prototype);
NotAuthorizedError.prototype.constructor = NotAuthorizedError;

module.exports = NotAuthorizedError;
