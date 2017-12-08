'use strict';

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var config = require('./config.json');

describe('slouch', function () {

  // Sometimes the DB gets a little backed up so we need more time for our tests
  this.timeout(20000);

  require('./spec');

});
