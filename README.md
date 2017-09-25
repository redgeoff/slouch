# slouch

[![Greenkeeper badge](https://badges.greenkeeper.io/redgeoff/slouch.svg)](https://greenkeeper.io/) [![Circle CI](https://circleci.com/gh/redgeoff/slouch.svg?style=svg&circle-token=ae7548ebc7e23a051ed03dbc3209c5e0529e260a)](https://circleci.com/gh/redgeoff/slouch)

A JS API for CouchDB that does the heavy lifting


## Slouch is a good alternative to nano:

  - You don't have to create an instance for each DB
  - Supports native promises
  - Supports iterators
  - Automatically throttles connections to DB to avoid max_dbs_open errors
  - Automatically persists connections with exponential backoff in case DB restarts or connection is dropped
  - Works in node and in the browser
  - Provides upserts and "get and update" functions
  - Support for optionally ignoring conflicts, missing docs, etc...
  - Designed for both CouchDB 1 and CouchDB 2


## Table of Contents

* [Getting Started](https://github.com/redgeoff/slouch/wiki/Getting-Started)
* [Don't just relax. Slouch!](https://github.com/redgeoff/slouch/wiki/Don%27t-just-relax.-Slouch%21)
* [Examples](https://github.com/redgeoff/slouch/tree/master/examples)
* [Reference](https://github.com/redgeoff/slouch/wiki#table-of-contents)
* [Don’t Just Relax; Slouch: A JS Client for CouchDB that Does the Heavy Lifting](https://medium.com/@redgeoff/dont-just-relax-slouch-a-js-client-for-couchdb-that-does-the-heavy-lifting-d8232eba8e2c)

## [Testing/Contributing](TESTING.md)
