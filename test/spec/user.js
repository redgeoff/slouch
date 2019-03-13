'use strict';

var Slouch = require('../../scripts'),
  utils = require('../utils'),
  sporks = require('sporks'),
  Promise = require('sporks/scripts/promise'),
  NotAuthenticatedError = require('../../scripts/not-authenticated-error'),
  NotAuthorizedError = require('../../scripts/not-authorized-error');

describe('user', function () {

  var slouch = null,
    user = null,
    defaultUpdate = null,
    username = null,
    defaultReq = null,
    dbs = null,
    slouchNoAuth = null,
    notAuthenticatedErr = new NotAuthenticatedError(),
    notAuthorizedErr = new NotAuthorizedError();

  beforeEach(function () {
    slouch = new Slouch(utils.couchDBURL());
    slouchNoAuth = new Slouch(utils.couchDBURLNoAuth());
    user = slouch.user;
    username = 'test_' + utils.nextId();
    defaultReq = slouch._req;
    dbs = [];
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
    slouch._req = defaultReq;
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

  var createPrivateDB = function () {
    return slouch.db.create(username).then(function () {
      // Add DB to list that will be destroyed
      dbs.push(username);

      // Set security so that only this user can access it
      return slouch.security.onlyRoleCanView(username, 'testrole1');
    }).then(function () {
      return slouch.doc.create(username, {
        foo: 'bar'
      });
    });
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

  it('should get the cookie from the response', function () {
    // Simulate browser where a cookie is not in the response
    var cookie = user._getCookieFromResponse({
      headers: {}
    });
    (cookie === null).should.eql(true);

    // Simulate node where a cookie IS in the response
    cookie = user._getCookieFromResponse({
      headers: {
        'set-cookie': ['my-cookie']
      }
    });
    cookie.should.eql('my-cookie');
  });

  it('should authenticate and get session', function () {

    slouch._req = function () {
      if (arguments['0'].uri.indexOf('_session') !== -1) {
        return Promise.resolve({
          headers: {
            'set-cookie': [
              'some-cookie'
            ]
          },
          body: {
            userCtx: {
              name: username,
              roles: ['testrole1']
            },
            cookie: 'some-cookie'
          }
        });
      } else {
        return defaultReq.apply(this, arguments);
      }
    };

    return user.authenticateAndGetSession(username, 'testpassword').then(function (session) {
      // Sanity check
      session.userCtx.name.should.eql(username);
      session.userCtx.roles.should.eql(['testrole1']);
      (session.cookie === undefined).should.eql(false);
    });
  });

  it('should not authenticate and get session', function () {
    return sporks.shouldThrow(function () {
      return user.authenticateAndGetSession(username, 'bad-password');
    }, notAuthenticatedErr);
  });

  it('should get session with default url', function () {
    // TODO: should be able to remove after cookie authentication works in the browser
    return slouch.user.getSession().then(function (response) {
      // Sanity test
      response.body.ok.should.eql(true);
    });
  });

  it('should not be authenticated when cookie missing', function () {
    return sporks.shouldThrow(function () {
      return user.authenticated('bad-cookie');
    }, notAuthenticatedErr);
  });

  it('should log in, get session and log out', function () {
    var n = 0;

    return createPrivateDB().then(function () {
      // Make sure cannot access DB before log in
      return sporks.shouldThrow(function () {
        return slouchNoAuth.db.get(username);
      }, notAuthorizedErr);
    }).then(function () {
      return slouchNoAuth.user.logIn(username, 'testpassword');
    }).then(function () {
      // This would throw if the user does not have access
      return slouchNoAuth.db.get(username).then(function () {
        return slouchNoAuth.doc.all(username).each(function () {
          n++;
        });
      }).then(function () {
        // Make sure we read a doc
        n.should.eql(1);
      }).then(function () {
        return slouchNoAuth.user.getSession().then(function (response) {
          // Sanity test
          response.body.userCtx.name.should.eql(username);
        });
      });
    }).then(function () {
      return slouchNoAuth.user.logOut();
    }).then(function () {
      // Make sure can no longer access DB
      return sporks.shouldThrow(function () {
        return slouchNoAuth.db.get(username);
      }, notAuthorizedErr);
    });
  });

  it('should not log in when password incorrect', function () {
    return createPrivateDB().then(function () {
      return sporks.shouldThrow(function () {
        return user.logIn(username, 'badpassword');
      }, notAuthenticatedErr);
    });
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
      doc.roles.sort().should.eql(['testrole1', 'testrole2', 'testrole3']);
    });
  });

  it('should ignore if no conflicts', function () {
    // Sanity test for code coverage
    return user.resolveConflicts(username);
  });

});
