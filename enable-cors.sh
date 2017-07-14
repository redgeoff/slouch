#!/usr/bin/env bash

# Enable CORS. This is only needed if you are connecting from another machine
sudo npm install -g add-cors-to-couchdb
add-cors-to-couchdb http://localhost:5984 -u admin -p admin
