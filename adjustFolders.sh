#!/bin/bash

for file in *.webm; do
    folder="${file% *.*}"
    mkdir -p "$folder"
    mv "$file" "${file%.webm}.metadata.json" "${file%.webm}.wav" "$folder/"
done