'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise');

describe('user', function () {

  var slouch = null,
    user = null,
    defaultUpdate = null,
    username = null,
    defaultRequest = null,
    dbs = [];

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    user = slouch.user;
    username = 'test_' + utils.nextId();
    defaultRequest = user._request.request;
    return user.create(username, 'testpassword', ['testrole1'], {
      firstName: 'Jill',
      email: 'test@example.com'
    });
  });

  var destroyDBs = function () {
    if (dbs.length > 0) {
      var promises = [];
      dbs.forEach(function (db) {
        promises.push(slouch.db.destroy(db));
      });
      return Promise.all(promises);
    }
  };

  afterEach(function () {
    user._request.request = defaultRequest;
    return user.destroy(username).then(function () {
      return destroyDBs();
    });
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

    // TODO: get authenticate() and authenticated() working properly in the browser. For now, we
    // have to fake the responses as it appears that the session cookie is not being propogated from
    // the session post to the session get.
    if (global.window) { // in browser?
      user._request.request = function () {
        if (arguments['0'].uri.indexOf('_session') !== -1) {
          return Promise.resolve({
            headers: {
              'set-cookie': [
                'some-cookie'
              ]
            },
            body: JSON.stringify({
              userCtx: {
                name: username,
                roles: ['testrole1']
              },
              cookie: 'some-cookie'
            })
          });
        } else {
          return defaultRequest.apply(this, arguments);
        }
      };
    }

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

  var generateUserConflict = function () {
    // Generate a conflict in a user doc by replicating to and from another DB which we will name
    // the same name as the username.
    return slouch.db.create(username).then(function () {
      // Add DB to list that will be destroyed
      dbs.push(username);

      // Replicate the user
      return slouch.db.replicate({
        source: slouch._url + '/_users',
        target: slouch._url + '/' + username
      });
    }).then(function () {
      // Add a role to the _users docs
      return user.addRole(username, 'testrole2');
    }).then(function () {
      // Add a role to the other DB's doc
      return slouch.doc.get(username, user.toUserId(username)).then(function (doc) {
        doc.roles = ['testrole1', 'testrole3'];
        return slouch.doc.update(username, doc);
      });
    }).then(function () {
      // Replicate the docs to generate a conflict
      return slouch.db.replicate({
        source: slouch._url + '/' + username,
        target: slouch._url + '/_users'
      });
    }).then(function () {
      // Make sure that the doc is in conflict
      return user.get(username, {
        conflicts: true
      });
    }).then(function (doc) {
      (doc._conflicts.length > 0).should.eql(true);
    });
  };

  it('should resolve conflicts', function () {
    return generateUserConflict().then(function () {
      return user.resolveConflicts(username);
    }).then(function () {
      return user.get(username, {
        conflicts: true
      });
    }).then(function (doc) {
      // Make sure there no conflicts
      (doc._conflicts === undefined).should.eql(true);

      // Make sure roles were merged
      doc.roles.should.eql(['testrole1', 'testrole2', 'testrole3']);
    });
  });

});
