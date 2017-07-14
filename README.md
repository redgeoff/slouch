# slouch

[![Circle CI](https://circleci.com/gh/redgeoff/slouch.svg?style=svg&circle-token=ae7548ebc7e23a051ed03dbc3209c5e0529e260a)](https://circleci.com/gh/redgeoff/slouch)

## Install

    $ npm install couch-slouch


## Slouch is a good alternative to nano as:

  - Don't have to create an instance for each DB
  - Native promises
  - Support for iterators
  - More CouchDB support, e.g. admin functions
  - Automatically throttles connections to DB to avoid max_dbs_open errors
  - Automatically persists connections with exponential backoff in case DB restarts or connection is dropped
  - Also works in the browser
  - Upserts, "get and put", support for optionally ignoring conflicts, missing docs, etc...
