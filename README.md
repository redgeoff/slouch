# slouch

[![Circle CI](https://circleci.com/gh/redgeoff/slouch.svg?style=svg&circle-token=ae7548ebc7e23a051ed03dbc3209c5e0529e260a)](https://circleci.com/gh/redgeoff/slouch)

## Install

    $ npm install couch-slouch


## Slouch is a good alternative to nano as:

  - You don't have to create an instance for each DB
  - Supports native promises
  - Supports iterators
  - Automatically throttles connections to DB to avoid max_dbs_open errors
  - Automatically persists connections with exponential backoff in case DB restarts or connection is dropped
  - Works in node and in the browser
  - Provides upserts and "get and put" functions
  - Support for optionally ignoring conflicts, missing docs, etc...
