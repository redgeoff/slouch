## API Reference

 * attachment
   * get(dbName, docId, attachmentName)
   * destroy(dbName, docId, attachmentName, rev)
 * config
   * get(path)
   * set(path)
   * setCompactionRule(dbName, rule)
   * setCouchDBMaxDBsOpen(maxDBsOpen)
   * setCouchHttpdAuthTimeout(timeoutSecs)
   * setCouchHttpdAuthAllowPersistentCookies(allow)
   * setLogLevel(level)
   * setHttpdMaxConnections(maxConnections)
   * unset(path)
   * unsetIgnoreMissing(path)
 * db
   * all()
   * [changes(dbName, params, filter)](https://github.com/redgeoff/slouch/blob/master/API.md#changesdbname-params-filter)
   * [changesArray(dbName, params, filter)](https://github.com/redgeoff/slouch/blob/master/API.md#changesarraydbname-params-filter)
   * copy(fromDBName, toDBName)
   * create(dbName)
   * destroy(dbName)
   * exists(dbName)
   * replicate(params)
   * get(dbName)
   * view(dbName, viewDocId, view, params)
   * viewArray(dbName, viewDocId, view, params)
 * doc
   * all(dbName, params)
   * allArray(dbName, params)
   * bulkCreateOrUpdate(dbName, docs)
   * create(dbName, doc)
   * createAndIgnoreConflict(dbName, doc)
   * createOrUpdate(dbName, doc)
   * createOrUpdateIgnoreConflict(dbName, doc)
   * destroy(dbName, docId, docRev)
   * destroyAll(dbName, keepDesignDocs)
   * destroyAllNonDesign(dbName)
   * destroyIgnoreConflict(dbName, docId, docRev)
   * exists(dbName, id)
   * [find(dbName, body, params)](https://github.com/redgeoff/slouch/blob/master/API.md#finddbname-body-params)
   * get(dbName, docId)
   * getAndDestroy(dbName, docId)
   * getIgnoreMissing(dbName, id)
   * getMergeCreateOrUpdate(dbName, doc)
   * getMergeUpdate(dbName, doc)
   * getMergeUpdateIgnoreConflict(dbName, doc)
   * getMergeUpsert(dbName, doc)
   * getModifyUpsert(dbName, docId, onGetPromiseFactory)
   * ignoreConflict(promiseFactory)
   * ignoreMissing(promiseFactory)
   * isConflictError(err)
   * isMissingError(err)
   * markAsDestroyed(dbName, docId)
   * setDestroyed(doc)
   * update(dbName, doc)
   * updateIgnoreConflict(dbName, doc)
   * upsert(dbName, doc)
 * ExcludeDesignDocIterator
 * membership
   * get()
 * NotAuthenticatedError
 * NotAuthorizedError
 * security
   * get(dbName)
   * onlyAdminCanView(dbName)
   * onlyRoleCanView(dbName, role)
   * set(dbName, security)
 * system
   * get()
   * isCouchDB1()
   * supportPartitioned()
   * reset(exceptDBNames)
   * updates(params)
   * updatesNoHistory(params)
   * updatesViaGlobalChanges(params)
 * user
   * addRole(username, role)
   * authenticate(username, password)
   * authenticateAndGetSession(username, password)
   * authenticated(cookie)
   * create(username, password, roles, metadata)
   * createSession(doc)
   * destroy(username)
   * destroySession([cookie])
   * downsertRole(username, role)
   * get(username)
   * getSession([cookie], [url])
   * logIn(username, password)
   * logOut()
   * removeRole(username, role)
   * resolveConflicts(username)
   * setCookie(cookie)
   * setPassword(username, password)
   * setMetadata(username, metadata)
   * toUserId(username)
   * toUsername(userId)
   * upsertRole(username, role)

### DB

#### changes(dbName, params, filter)

Returns a list of changes in the database. See https://docs.couchdb.org/en/stable/api/database/changes.html for more details.

The function returns an iterator that indefinitely returns changes from the database.

You can use an optional third argument to pass a selector for filtering the change feed.

Example:

```js
slouch.db.changes('myDB', {
  include_docs: true,
  feed: 'continuous',
  heartbeat: true
}, {
  selector: {
    thing: 'findme'
  }
});
```

#### changesArray(dbName, params, filter)

Returns a list of changes in the database. See https://docs.couchdb.org/en/stable/api/database/changes.html for more details.

The function returns an array of changes from the database.

You can use an optional third argument to pass a selector for filtering the change feed.

Example:

```js
slouch.db.changesArray('myDB', {
  include_docs: true,
  feed: 'continuous',
  heartbeat: true
}, {
  selector: {
    thing: 'findme'
  }
});
```

### Doc

#### find(dbName, body, params)

Find documents using a declarative JSON querying syntax. See https://docs.couchdb.org/en/latest/api/database/find.html for more details.

Example:

```js
slouch.doc.find('myDB', {
  selector: {
    thing: 'findme'
  }
});
```
