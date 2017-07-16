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
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  var createBase64Attachment = function () {
    return slouch.doc.update('testdb', {
      _id: 'foo',
      _attachments: {
        'my_image.png': {
          data: base64Data,
          content_type: 'image/png'
        }
      }
    });
  };

  // TODO
  // it('should create attachment', function () {
  //   var data = bufferFrom(base64Data);
  //   return slouch.doc.create('testdb', {
  //     _id: 'foo'
  //   }).then(function () {
  //     return slouch.doc.get('testdb', 'foo');
  //   }).then(function (doc) {
  //     return slouch.attachment.create('testdb', 'foo', 'my_file.png', data, 'image/png',
  //       doc._rev);
  //   });
  // });

  it('should create attachment from base 64 data', function () {
    return createBase64Attachment().then(function () {
      return slouch.doc.get('testdb', 'foo');
    }).then(function (doc) {
      doc._attachments['my_image.png'].content_type.should.eql('image/png');

      return slouch.attachment.get('testdb', 'foo', 'my_image.png');
    }).then(function (attachment) {
      var base64Attach = new Buffer(attachment).toString('base64');
      base64Attach.should.eql(base64Data);
    });
  });

  it('should destroy attachment', function () {
    return createBase64Attachment().then(function () {
      return slouch.doc.get('testdb', 'foo');
    }).then(function (doc) {
      return slouch.attachment.destroy('testdb', 'foo', 'my_image.png', doc._rev);
    }).then(function () {
      return slouch.doc.get('testdb', 'foo');
    }).then(function (doc) {
      (doc._attachments === undefined).should.eql(true);
    });
  });

});
