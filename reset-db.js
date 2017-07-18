#!/usr/bin/env node

'use strict';

var Slouch = require('./scripts'),
  utils = require('./test/utils'),
  slouch = new Slouch(utils.couchDBURL());

slouch.system.reset();
