'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks');

describe('user', function () {

  var slouch = null,
    user = null,
    defaultUpdate = null,
    username = null;

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    user = slouch.user;
    username = 'test_' + utils.nextId();
    return user.create(username, 'testpassword', ['testrole1'], {
      firstName: 'Jill',
      email: 'test@example.com'
    });
  });

  afterEach(function () {
    return user.destroy(username);
  });

  var fakeConflict = function () {
    var i = 0;
    defaultUpdate = user._update;
    user._update = function () {
      if (i++ < 3) {
        var err = new Error();
        err.error = 'conflict';
        return sporks.promiseError(err);
      } else {
        return defaultUpdate.apply(this, arguments);
      }
    };
  };

  // NOTE: create and destroy tested by beforeEach() and afterEach()

  it('should not create when already exists', function () {
    var err = null;
    return user.create(username, 'testpassword').catch(function (_err) {
      err = _err;
    }).then(function () {
      (err === null).should.eql(false);
    });
  });

  it('should get', function () {
    return user.get(username).then(function (_user) {
      _user._id.should.eql('org.couchdb.user:' + username);
      _user.name.should.eql(username);
      _user.roles.should.eql(['testrole1']);
      _user.type.should.eql('user');
      _user.metadata.should.eql({
        firstName: 'Jill',
        email: 'test@example.com'
      });
      user.toUsername(_user._id).should.eql(username);
    });
  });

  it('should add role', function () {
    return user.addRole(username, 'testrole2').then(function () {
      return user.get(username);
    }).then(function (_user) {
      _user.roles.should.eql(['testrole1', 'testrole2']);
    });
  });

  it('should upsert role', function () {
    fakeConflict();
    return user.upsertRole(username, 'testrole2').then(function () {
      return user.get(username);
    }).then(function (_user) {
      _user.roles.should.eql(['testrole1', 'testrole2']);
    });
  });

  it('should remove role', function () {
    return user.addRole(username, 'testrole2').then(function () {
      return user.removeRole(username, 'testrole1');
    }).then(function () {
      return user.get(username);
    }).then(function (_user) {
      _user.roles.should.eql(['testrole2']);
    });
  });

  it('should downsert role', function () {
    return user.addRole(username, 'testrole2').then(function () {
      fakeConflict();
      return user.downsertRole(username, 'testrole1');
    }).then(function () {
      return user.get(username);
    }).then(function (_user) {
      _user.roles.should.eql(['testrole2']);
    });
  });

  it('should set password', function () {
    var origUser = null;
    return user.get(username).then(function (_user) {
      origUser = _user;
      return user.setPassword(username, 'testpassword2');
    }).then(function () {
      return user.get(username);
    }).then(function (_user) {
      // Make sure password changed
      (_user.derived_key === origUser.derived_key).should.eql(false);
    });
  });

  it('should set metadata', function () {
    return user.setMetadata(username, {
      firstName: 'Jack'
    }).then(function () {
      return user.get(username);
    }).then(function (_user) {
      _user.metadata.firstName.should.eql('Jack');
    });
  });

  it('should authenticate and get session', function () {
    return user.authenticateAndGetSession(username, 'testpassword').then(function (session) {
      // Sanity check
      session.userCtx.name.should.eql(username);
      session.userCtx.roles.should.eql(['testrole1']);
      (session.cookie === undefined).should.eql(false);
    });
  });

  it('should not authenticate and get session', function () {
    var err = new Error();
    err.name = 'NotAuthenticatedError';
    return sporks.shouldThrow(function () {
      return user.authenticateAndGetSession(username, 'bad-password');
    }, err);
  });

  it('should not be authenticated when cookie missing', function () {
    var err = new Error();
    err.name = 'NotAuthenticatedError';
    return sporks.shouldThrow(function () {
      return user.authenticated('bad-cookie');
    }, err);
  });

});
