#!/bin/bash

cd 'podcasts/en/deep-dive-bible' || exit

mapfile -t chapters < <(ls *.json) 
delimiter=' '

for file in "${chapters[@]}"; do
    chapter=$(basename "$file" .json)
    book="${chapter%"$delimiter"*}"
    mv "$file" "$book"
    mv "${chapter}.txt" "$book"
done