'use strict';

var promisedRequest = require('./request');

var Attachment = function (slouch) {
  this._slouch = slouch;
};

Attachment.prototype.get = function (dbName, docId, attachmentName) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/' + docId + '/' + attachmentName,
    method: 'GET',
    raw: true,
    encoding: null
  }).then(function (response) {
    return response.body;
  });
};

module.exports = Attachment;
