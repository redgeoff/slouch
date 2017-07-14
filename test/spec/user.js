'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils');

describe('user', function () {

  var slouch = new Slouch(utils.couchDBURL()),
    user = slouch.user;

  beforeEach(function () {
    return user.create('testusername', 'testpassword', ['testrole1'], {
      firstName: 'Jill',
      email: 'test@example.com'
    });
  });

  afterEach(function () {
    return user.destroy('testusername');
  });

  // NOTE: create and destroy tested by beforeEach() and afterEach()

  it('should not create when already exists', function () {
    var err = null;
    return user.create('testusername', 'testpassword').catch(function (_err) {
      err = _err;
    }).then(function () {
      (err === null).should.eql(false);
    });
  });

  it('should get', function () {
    return user.get('testusername').then(function (_user) {
      _user._id.should.eql('org.couchdb.user:testusername');
      _user.name.should.eql('testusername');
      _user.roles.should.eql(['testrole1']);
      _user.type.should.eql('user');
      _user.metadata.should.eql({
        firstName: 'Jill',
        email: 'test@example.com'
      });
    });
  });

  it('should add role', function () {
    return user.addRole('testusername', 'testrole2').then(function () {
      return user.get('testusername');
    }).then(function (_user) {
      _user.roles.should.eql(['testrole1', 'testrole2']);
    });
  });

  it('should set password', function () {
    var origUser = null;
    return user.get('testusername').then(function (_user) {
      origUser = _user;
      return user.setPassword('testusername', 'testpassword2');
    }).then(function () {
      return user.get('testusername');
    }).then(function (_user) {
      // Make sure password changed
      (_user.derived_key === origUser.derived_key).should.eql(false);
    });
  });

  it('should set metadata', function () {
    return user.setMetadata('testusername', {
      firstName: 'Jack'
    }).then(function () {
      return user.get('testusername');
    }).then(function (_user) {
      _user.metadata.firstName.should.eql('Jack');
    });
  });

});
