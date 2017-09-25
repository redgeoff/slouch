### How to run the tests?

- Have a local couchdb instance running (or set the db url with COUCHDB_PORT)
- Make sure this db has a \_users db and an admin with admin/admin username/password
- Run: `npm run <TEST_SCRIPT>` where TEST_SCRIPT is one of the following:

    node-test
    node-full-test
    browser-server
    browser-test
    browser-test-firefox
    browser-test-chrome
    browser-test-phantomjs
    browser-coverage-server
    browser-coverage-test
    browser-coverage-report
    browser-coverage-checkcoverage.json
    browser-coverage-full-test

