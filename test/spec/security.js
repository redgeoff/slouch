'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('security', function () {

  var slouch = new Slouch(utils.couchDBURL());

  beforeEach(function () {
    return utils.createDB();
  });

  afterEach(function () {
    return utils.destroyDB();
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
    return slouch.security.set(utils.createdDB, security).then(function () {
      return slouch.security.get(utils.createdDB);
    }).then(function (_security) {
      _security.should.eql(security);
    });
  });

  it('only admin can view', function () {
    return slouch.security.onlyAdminCanView(utils.createdDB);
  });

  it('only role can view', function () {
    return slouch.security.onlyRoleCanView(utils.createdDB, 'role').then(function () {
      return slouch.security.get(utils.createdDB);
    }).then(function (_security) {
      return _security.should.eql({
        'admins': {
          'names': ['_admin'],
          'roles': []
        },
        'members': {
          'names': [],
          'roles': ['role']
        }
      });
    });
  });

  it('only user can view', function () {
    return slouch.security.onlyUserCanView(utils.createdDB, 'user').then(function () {
      return slouch.security.get(utils.createdDB);
    }).then(function (_security) {
      return _security.should.eql({
        'admins': {
          'names': ['_admin'],
          'roles': []
        },
        'members': {
          'names': ['user'],
          'roles': []
        }
      });
    });
  });

});
