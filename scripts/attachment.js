'use strict';

var promisedRequest = require('./request');

var Attachment = function (slouch) {
  this._slouch = slouch;
};

// TODO
// Attachment.prototype.create = function (dbName, docId, attachmentName, data, contentType, rev) {
//   var formData = {
//     custom_file: {
//       value: data,
//       options: {
//         filename: attachmentName,
//         contentType: contentType
//       }
//     }
//   };
//
//   return promisedRequest.request({
//     uri: this._slouch._url + '/' + dbName + '/' + docId + '/' + attachmentName +
//       '?rev=' + encodeURIComponent(rev),
//     method: 'PUT',
//     // raw: true,
//     // encoding: null,
//     formData: formData
//   }).then(function (response) {
//     return response.body;
//   });
// };

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

Attachment.prototype.destroy = function (dbName, docId, attachmentName, rev) {
  return promisedRequest.request({
    uri: this._slouch._url + '/' + dbName + '/' + docId + '/' + attachmentName,
    method: 'DELETE',
    qs: {
      rev: rev
    }
  });
};

module.exports = Attachment;
