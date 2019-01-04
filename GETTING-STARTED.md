Install Slouch:

```
$ npm install couch-slouch
```

Create an instance:

```js
var Slouch = require('couch-slouch');
var slouch = new Slouch('http://localhost:5984');
```

Create a database:

```js
slouch.db.create('mydb').then(function () {
  // Database was created
});
```

Create a doc:

```js
slouch.doc.create('mydb', { foo: 'bar' }).then(function (doc) {
  // Doc was created and doc.id and doc.rev are populated
});
```

Update the doc:

Note: `doc.id` and `doc.rev` are the values returned by `slouch.doc.create()` or `slouch.doc.get()`. You always need the `id` and latest `rev` when updating a doc.

```js
slouch.doc.update('mydb', { _id: doc.id, _rev: doc.rev, foo: 'yar' }).then(function (doc) {
  // Doc was updated and doc.id and doc.rev are populated
});
```

Get the doc:

```js
slouch.doc.get('mydb', doc._id).then(function (doc) {
  // doc is retrieved
});
```

Destroy (delete) the doc:

Note: `doc.id` and `doc.rev` are the values returned by `slouch.doc.create()` or `slouch.doc.get()`. You always need the `id` and latest `rev` when destroying a doc.

```js
slouch.doc.destroy('mydb', doc._id, doc._rev).then(function () {
  // Doc was destroyed
});
```

Destroy (delete) the database:

```js
slouch.db.destroy('mydb').then(function () {
  // DB was destroyed
});
```

And, putting it all together:

```js
var Slouch = require('couch-slouch');
var slouch = new Slouch('http://localhost:5984');

// Create the database
slouch.db.create('mydb').then(function () {

  // Create a doc
  return slouch.doc.create('mydb', { foo: 'bar' });

}).then(function (doc) {

  // Update the doc
  return slouch.doc.update('mydb', { _id: doc.id, _rev: doc.rev, foo: 'yar' });

}).then(function (doc) {

  // Get the doc
  return slouch.doc.get('mydb', doc._id);

}).then(function (doc) {

  // Destroy the doc
  return slouch.doc.destroy('mydb', doc._id, doc._rev);

}).then(function () {

  // Destroy the database
  return slouch.db.destroy('mydb');

}).then(function () {

  // Database was destroyed

});
```




