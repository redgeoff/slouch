'use strict';

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

describe('slouch', function () {

  // Sometimes the DB gets a little backed up so we need more time for our tests
  // this.timeout(10000);

  require('./spec');

});
