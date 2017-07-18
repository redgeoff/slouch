#!/usr/bin/env bash

# Run the container and make sure that it always restarts, even when the box is rebooted
docker run -d \
  --name couchdb-1 \
  --restart always \
  -p 15984:5984 \
  couchdb:1.6.1

# Wait for for DB to be ready
echo "Sleeping for 15 secs to allow for DB to start..."
sleep 15

# Create admin user
curl -X PUT localhost:15984/_config/admins/admin -d '"admin"'
