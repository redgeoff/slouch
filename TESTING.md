# Testing

## Set up dev enviornment

### Option A: Automated setup via Vagrant

This option will automatically install an isolated dev env that you can destroy or rebuild at any point.

- Install Vagrant (http://www.vagrantup.com) and VirtualBox (https://www.virtualbox.org)
- $ git clone https://github.com/redgeoff/node-couchdb-vagrant.git
- $ cd node-couchdb-vagrant
- $ vagrant up
- $ vagrant ssh
- $ git clone https://github.com/redgeoff/slouch
- $ cd slouch
- $ npm install
- $ npm run test

### Option B: Running CouchDB in Docker

Install CouchDB locally. You can easily run CouchDB via docker with:

    $ ./run-couchdb-docker.sh

Notes:
- If you are not running ubuntu, you will probably have to configure the `common` variable
- If you are running the tests against a CouchDB instance on another box then you will need to enable CORs, e.g. ./enable-cors.sh and you will also need to change the `host` entry in test/spec/config.json

### Option C: Install CouchDB manually

- Visit http://couchdb.apache.org and install CouchDB
- Make sure to create the missing system DBs: _users, _global_changes, _replicators, e.g. see [run-couchdb-docker.sh](https://github.com/redgeoff/slouch/blob/master/run-couchdb-docker.sh#L22)
- Make sure to set the admin username to _admin_ and the admin password to _admin_

## Resetting the DB

If your DB accumulates a lot of junk data and you want to clear it, you can do so with:

    $ npm run reset-db

Warning: this will delete all your databases!


## Beautify

We use [beautify-proj](https://github.com/delta-db/beautify-proj) to beautify all of our code. This helps us to keep our coding style standardized. If the `assert-beautified` test fails then you'll want to run `npm run beautify` and then commit the changes.


## Test in node

This will run the tests in node:

    $ npm run node-test

You can also check for 100% code coverage using:

    $ npm run node-full-test
    You can then view the test coverage by opening cache/coverage/node/lcov-report/index.html in a browser

Run specific tests:

    $ npm run node-test -- -- -g 'some reg-ex'

Run specific tests and generate code coverage:

    $ npm run node-test -- -- --coverage -g 'some reg-ex'


## Manual browser tests

    $ npm run browser-server
    Use any browser to visit http://127.0.0.1:8001/browser/index.html
    And you can filter the tests, e.g. http://127.0.0.1:8001/browser/index.html?grep=reg-ex


## Automated browser tests

Testing in headless Chrome:

Note: you must have Chrome installed

    $ npm run browser-test

You can also filter the tests, e.g.

    $ npm run browser-test -- -g 'some reg-ex'

Firefox:

Note: you must have Firefox installed

    $ npm run browser-test -- -b selenium:firefox

To test in headless Chrome, generate code coverage and check for 100% coverage:

    $ npm run browser-coverage-full-test

You can then view the test coverage by opening cache/coverage/browser/lcov-report/index.html in any browser
