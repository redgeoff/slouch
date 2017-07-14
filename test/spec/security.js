'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('security', function () {

  var slouch = new Slouch(utils.couchDBURL()),
    db = slouch.db;

  beforeEach(function () {
    return db.create('testdb');
  });

  afterEach(function () {
    return db.destroy('testdb');
  });

  it('should set and get security', function () {
    var security = {
      'admins': {
        'names': ['joe', 'phil'],
        'roles': ['boss']
      },
      'members': {
        'names': ['dave'],
        'roles': ['producer', 'consumer']
      }
    };
    return slouch.security.set('testdb', security).then(function () {
      return slouch.security.get('testdb');
    }).then(function (_security) {
      _security.should.eql(security);
    });
  });

});
