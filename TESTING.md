# Testing


## Set up

Install CouchDB locally. You can easily run CouchDB via docker with:

    $ ./run-couchdb-docker.sh

Notes:
- If you are not running ubuntu, you will probably have to configure the `common` variable
- If you are running the tests against a CouchDB instance on another box then you will need to enable CORs, e.g. ./enable-cors.sh and you will also need to change the `host` entry in test/spec/config.json


## Resetting the DB

If your DB accumulates a lot of junk data and you want to clear it, you can do so with:

    $ npm run reset-db

Warning: this will delete all your databases!


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
    Use any browser to visit http://127.0.0.1:8001/index.html
    And you can filter the tests, e.g. http://127.0.0.1:8001/index.html?grep=reg-ex


## Automated browser tests

phantomjs:

    $ npm run browser-test-phantomjs

You can also filter the tests, e.g.

    $ npm run browser-test-phantomjs -- -g 'some reg-ex'

Chrome:

Note: you must have Chrome installed

    $ npm run browser-test-phantomjs -- -b selenium:chrome

Firefox:

Note: you must have Firefox installed

    $ npm run browser-test-phantomjs -- -b selenium:firefox

Test in phantomjs, generate code coverage and check for 100% coverage:

    $ npm run browser-coverage-full-test
    You can then view the test coverage by opening cache/coverage/browser/lcov-report/index.html in any browser
