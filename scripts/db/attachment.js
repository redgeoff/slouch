'use strict';

var promisedRequest = require('../request');

var DB = function () {};

DB.prototype.getAttachment = function (dbName, docId, attachmentName) {
  return promisedRequest.request({
    uri: this._url + '/' + dbName + '/' + docId + '/' + attachmentName,
    method: 'GET',
    raw: true,
    encoding: null
  }).then(function (response) {
    return response.body;
  });
};

module.exports = DB;
