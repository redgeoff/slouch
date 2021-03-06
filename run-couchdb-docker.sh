#!/usr/bin/env bash

# Define a location to persist our database files
common=/home/ubuntu/common

# Run the container and make sure that it always restarts, even when the box is rebooted
docker run -d \
  --name couchdb \
  --restart always \
  -p 5984:5984 \
  -v $common:/data:/opt/couchdb/data \
  -e COUCHDB_USER='admin' \
  -e COUCHDB_PASSWORD='admin' \
  couchdb

# Wait for for DB to be ready
echo "Sleeping for 15 secs to allow for DB to start..."
sleep 15

# Create system DBs
echo "Creating system DBs"
curl -X PUT http://admin:admin@localhost:5984/_users
curl -X PUT http://admin:admin@localhost:5984/_replicator
curl -X PUT http://admin:admin@localhost:5984/_global_changes

# Enable CORS. This is only needed if you are connecting from another machine
#./enable-cors.sh
