'use strict';

// This example illustrates how to read all the docs in a database with nano and not slouch. See
// ./all.js for a comparable and more condensed example using slouch.

// Notes:
// - You can use something like Promise.promisfy() or nano-promises to simplify some of the code
//   below by using promises instead of callbacks.
// - This example is not fault tolerant. If the database connection is dropped or the database
//   throws an error like max_dbs_open then the code will just crash. You can of course implement
//   a retry mechanism, but that would introduce yet more code.

var nano = require('nano')('http://admin:admin@localhost:5984'),
  JSONStream = require('JSONStream');

// Create the database
nano.db.create('mydb', function (err) {

  if (err) {
    throw err;
  } else {

    var mydb = nano.db.use('mydb');

    // Create a doc
    mydb.insert({ foo: 'bar' }, function (err, body, header) {

      if (err) {
        throw err;
      } else {

        // Create another doc
        mydb.insert({ foo: 'nar' }, function (err, body, header) {

          if (err) {
            throw err;
          } else {

            var all = mydb.list({ include_docs: true })
            .pipe(JSONStream.parse('rows.*'))
            .on('data', function (item) {

              var stream = this;

              stream.pause();

              Promise.resolve('foo => ' + item.doc.foo).then(function () {
                // We are done processing the item so resume. Although not fully illustrated by the
                // 2 docs we created in this example, we'll assume that there are a large number of
                // docs and therefore we don't want to move onto the next item until we are done
                // processing this doc. Otherwise, in many cases, we can quickly run out memory from
                // creating many concurrent promises.
                stream.resume();
              });

            })
            .on('end', function () {

              // Done iterating through all docs

              nano.db.destroy('mydb', function (err) {

                if (err) {
                  throw err;
                } else {
                  // Database destroyed
                }

              });

            });

          }

        });

      }

    });

  }

});
