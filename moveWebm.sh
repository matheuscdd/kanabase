#!/bin/bash

cd 'podcasts/pt/mergulho-profundo-bíblia' || exit

for file in *.webm; do
    book="${file% *.*}"
    chapter="${file%.webm}"
    mkdir -p "$book"
    mkdir -p "$book/$chapter"
    mv "$file" "$book/$chapter"
done


find . -type f -name "*.webm" -print0 | while IFS= read -r -d '' file; do
    echo "$file"
    git add "$file"

    if ! git diff --cached --quiet -- "$file"; then
        git commit -m "Adiciona $(basename "$file")" && git push origin main
    fi
done