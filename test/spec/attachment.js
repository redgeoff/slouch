'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('attachment', function () {

  var slouch = null,
    db = null;

  // Base64 encoded 10px by 10px black PNG. Source: http://png-pixel.com
  var base64Data = [
    'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAEUlEQVR42mNk+M+AARiHsiAAcCIKAYwFoQ8AAAAASUVO',
    'RK5CYII='
  ].join('');

  // TODO: will be needed when support binary attachments
  // // As per https://stackoverflow.com/a/14573049/2831606, we need an abstraction as the API can
  // // differ
  // var bufferFrom = function () {
  //   if (typeof Buffer.from === 'function') {
  //     // Node 5.10+
  //     return Buffer.from(base64Data, 'base64');
  //   } else {
  //     // older Node versions
  //     return new Buffer(base64Data, 'base64');
  //   }
  // };

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    db = slouch.db;
    return utils.createDB();
  });

  afterEach(function () {
    return utils.destroyDB();
  });

  var createBase64Attachment = function () {
    return slouch.doc.update(utils.createdDB, {
      _id: 'foo',
      _attachments: {
        'my_image.png': {
          data: base64Data,
          content_type: 'image/png'
        }
      }
    });
  };

  var createBase64AttachmentWithSlash = function (dbName, docId, attachmentId) {
    var doc = {
      _id: docId,
      _attachments: {}
    };
    doc._attachments[attachmentId] = {
      data: base64Data,
      content_type: 'image/png'
    };
    return slouch.doc.update(dbName, doc);
  };

  // TODO
  // it('should create attachment', function () {
  //   var data = bufferFrom(base64Data);
  //   return slouch.doc.create(utils.createdDB, {
  //     _id: 'foo'
  //   }).then(function () {
  //     return slouch.doc.get(utils.createdDB, 'foo');
  //   }).then(function (doc) {
  //     return slouch.attachment.create(utils.createdDB, 'foo', 'my_file.png', data, 'image/png',
  //       doc._rev);
  //   });
  // });

  it('should create attachment from base 64 data', function () {
    return createBase64Attachment().then(function () {
      return slouch.doc.get(utils.createdDB, 'foo');
    }).then(function (doc) {
      doc._attachments['my_image.png'].content_type.should.eql('image/png');

      return slouch.attachment.get(utils.createdDB, 'foo', 'my_image.png');
    }).then(function (attachment) {
      var base64Attach = new Buffer(attachment).toString('base64');
      base64Attach.should.eql(base64Data);
    });
  });

  it('should destroy attachment', function () {
    return createBase64Attachment().then(function () {
      return slouch.doc.get(utils.createdDB, 'foo');
    }).then(function (doc) {
      return slouch.attachment.destroy(utils.createdDB, 'foo', 'my_image.png', doc._rev);
    }).then(function () {
      return slouch.doc.get(utils.createdDB, 'foo');
    }).then(function (doc) {
      (doc._attachments === undefined).should.eql(true);
    });
  });

  it('should create attachment from base 64 data with slash in name', function () {
    var dbName = utils.createdDB + '/test';
    var docId = 'foo/bar';
    var attachmentId = 'my/image.png';
    return db.create(dbName)
      .then(function () {
        return createBase64AttachmentWithSlash(dbName, docId, attachmentId);
      })
      .then(function () {
        return slouch.doc.get(dbName, docId);
      }).then(function (doc) {
        doc._attachments[attachmentId].content_type.should.eql('image/png');

        return slouch.attachment.get(dbName, docId, attachmentId);
      }).then(function (attachment) {
        var base64Attach = new Buffer(attachment).toString('base64');
        base64Attach.should.eql(base64Data);
        return db.destroy(dbName);
      });
  });

  it('should destroy attachment with slash in name', function () {
    var dbName = utils.createdDB + '/test';
    var docId = 'foo/bar';
    var attachmentId = 'my/image.png';
    return db.create(dbName)
      .then(function () {
        return createBase64AttachmentWithSlash(dbName, docId, attachmentId);
      })
      .then(function () {
        return slouch.doc.get(dbName, docId);
      }).then(function (doc) {
        return slouch.attachment.destroy(dbName, docId, attachmentId, doc._rev);
      }).then(function () {
        return slouch.doc.get(dbName, docId);
      }).then(function (doc) {
        (doc._attachments === undefined).should.eql(true);
        return db.destroy(dbName);
      });
  });
});
