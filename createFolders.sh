#!/bin/bash

cd 'podcasts/pt/mergulho-profundo-bíblia' || exit

for file in *.webm; do
    book="${file% *.*}"
    chapter="${file%.webm}"
    mkdir -p "$book"
    mkdir -p "$book/$chapter"
    mv "$file" "$book/$chapter"
done

