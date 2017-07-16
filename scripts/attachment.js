'use strict';

var promisedRequest = require('./request');

var Attachment = function (slouch) {
  this._slouch = slouch;
};

// TODO
// Attachment.prototype.create = function (dbName, docId, attachmentName, data, contentType) {
//   var formData = {
//     my_file: {
//       value: data,
//       options: {
//         contentType: contentType
//       }
//     }
//   };
//
//   return promisedRequest.request({
//     uri: this._slouch._url + '/' + dbName + '/' + docId + '/' + attachmentName,
//     method: 'POST',
//     raw: true,
//     encoding: null,
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

module.exports = Attachment;
