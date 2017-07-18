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

});
