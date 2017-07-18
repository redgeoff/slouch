'use strict';

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var config = require('./config.json');

if (process.env.COUCHDB_PORT) {
  config.couchdb.port = process.env.COUCHDB_PORT;
}

describe('slouch', function () {

  // Sometimes the DB gets a little backed up so we need more time for our tests
  this.timeout(10000);

  require('./spec');

});
