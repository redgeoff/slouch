# Don't just relax. Slouch!

## Fault Tolerant

Slouch attempts to retry your requests in the event that the connection to your database is temporarily lost. Moreover, it retries through max_dbs_open errors and other transient errors to avoid your application from crashing every time there is a hiccup on the database.


## StreamIterators

StreamIterators are available for all requests that can return a large number of docs, i.e. `db.changes()`, `db.view()`, `doc.all()`, `system.updates()`

StreamIterators work with promises and reduce your code by introducing a simple and powerful pattern.


### Example 1 - Sequentially process all docs in a DB

```js
slouch.doc.all('mydb', { include_docs: true }).each(function (item) {

  // If we return a promise then the all() iterator won't move on to the next item
  // until the promise resolves. This allows us to iterate through a large number
  // of docs without consuming a lot of memory. It also allows us to control the
  // flow of the docs and process them sequentially so that we don't end up
  // thrashing the processor with too many concurrent promises.
  return Promise.resolve('foo => ' + item.foo);

}).then(function () {

  // Done iterating through all docs

}).catch (function (err) {

  // An error occurred

});
```


### Example 2 - Process a max of 5 docs concurrently

```js
var Throttler = require('squadron').Throttler;
var throttler = new Throttler(5);

slouch.doc.all('mydb', { include_docs: true }).each(function (item) {

  return Promise.resolve('foo => ' + item.foo);

}, throttler).then(function () {

  // Done iterating through all docs

});
```


### Example 3 - Concurrently process all docs

Note: you should probably try to avoid this route unless your processing routine is incredibly fast. Otherwise, the number of promises you spawn will be unbounded and you will run out of memory as you'll be reading docs faster than you can process them.

```js
slouch.doc.all('mydb', { include_docs: true }).each(function (item) {

  // Note: a promise is not returned here
  console.log('foo => ' + item.foo);

}, throttler).then(function () {

  // Done iterating through all docs

});
```

### Example 4 - Continuously process all changes to a DB

`db.changes()`, `db.view()` and `system.updates()` support the feed=continuous option which causes the iterator  to loop indefinitely. These iterators are of the type PersistentStreamIterator, which means that the iterator will automatically reconnect, following an exponential backoff, in the event that a connection to the database is lost.

```js
var iterator = slouch.db.changes('mydb',
    { include_docs: true, feed: 'continuous' });

iterator.each(function (item) {

  return Promise.resolve('foo => ' + item.foo);

});
```

you can then abort this loop with `iterator.abort()`


## Helper functions

The CouchDB conflict policy is a very powerful convention and is at the heart of the database and the offline world. Sometimes however, conflicts don't matter to you and it's nice to have functions to ensure that your logic persists through these conflicts.

### createOrUpdate

Sometimes you just want to use the same function to create or update a doc:

```js
// Create a doc
slouch.doc.createOrUpdate('mydb', { _id: '1', foo: 'bar' }).then(function (doc) {

  // Update the doc
  return slouch.doc.createOrUpdate('mydb', { _id: '1', foo: 'yar' });

});
```

### upsert

And Sometimes you just want to force a creation or update even if there is a conflict:

```js
slouch.doc.upsert('mydb', { _id: '1', foo: 'bar' });
```

### getMergeUpsert

getMergeUpsert allows you to make partial updates without regard to conflicts

```js
// Create a doc
slouch.doc.create('mydb', { _id: '1', foo: 'bar' }).then(function (doc) {

  // Add the `yar` attr to the doc and persist through any conflicts
  return slouch.doc.getMergeUpsert('mydb', { _id: '1', yar: 'nar' });

});
```

### getModifyUpsert

getModifyUpsert allows you to make partial updates via a callback

```js
// Create a doc
slouch.doc.create('mydb', { _id: '1', foo: 'bar' }).then(function (doc) {

  // Add the `yar` attr to the doc via a callback and persist through any conflicts
  return slouch.doc.getModifyUpsert('mydb', '1', function (doc) {

    doc.yar = (new Date()).getTime();

    return doc;

  });

});
```
