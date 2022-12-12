'use strict';

var Attachment = function (slouch) {
  this._slouch = slouch;
};

Attachment.prototype.create = function (dbName, docId, attachmentName, data, contentType, rev) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName) + '/' + encodeURIComponent(
      docId) + '/' + encodeURIComponent(attachmentName) + '?rev=' + encodeURIComponent(rev),
    method: 'PUT',
    headers: {
      'Content-Type': contentType
    },
    raw: true,
    encoding: null,
    body: data
  }).then(function (response) {
    return response.body;
  });
};

Attachment.prototype.get = function (dbName, docId, attachmentName) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName) + '/' + encodeURIComponent(
      docId) + '/' + encodeURIComponent(attachmentName),
    method: 'GET',
    raw: true,
    encoding: null
  }).then(function (response) {
    return response.body;
  });
};

Attachment.prototype.destroy = function (dbName, docId, attachmentName, rev) {
  return this._slouch._req({
    uri: this._slouch._url + '/' + encodeURIComponent(dbName) + '/' + encodeURIComponent(
      docId) + '/' + encodeURIComponent(attachmentName),
    method: 'DELETE',
    qs: {
      rev: rev
    }
  });
};

module.exports = Attachment;
