#!/bin/bash

find "$1" \( -path ./node_modules -o -path ./.git -o -path ./package.json \) -prune -o \
-type f -name "*.json" \
-exec sh -c 'jq -c -M . "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;
