Slouch is a JS API for CouchDB that does the heavy lifting.


## Slouch is a good alternative to nano

* You don't have to create an instance for each DB
* Supports native promises
* Supports iterators
* Automatically throttles connections to DB to avoid max_dbs_open errors
* Automatically persists connections with exponential backoff in case DB restarts or connection is dropped
* Works in node and in the browser
* Provides upserts and "get and update" functions
* Support for optionally ignoring conflicts, missing docs, etc...
* Designed for both CouchDB 1 and CouchDB 2

## Table of Contents

* [Getting Started](https://github.com/redgeoff/slouch/wiki/Getting-Started)
* [Don't just relax. Slouch!](https://github.com/redgeoff/slouch/wiki/Don%27t-just-relax.-Slouch%21)
* [Examples](https://github.com/redgeoff/slouch/tree/master/examples])
* Reference
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
    * changes(dbName, params)
    * changesArray(dbName, params)
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
    * doc.find(dbName, body, params)
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

