#!/bin/bash

cd 'podcasts/en/deep-dive-bible' || exit
for dir in */ ; do
    # Remove a barra final
    dir="${dir%/}"
    # Verifica se existe algum .json em qualquer subnível
    if ! find "$dir" -type f -name '*.json' | grep -q .; then
        echo "$dir"
    fi
done